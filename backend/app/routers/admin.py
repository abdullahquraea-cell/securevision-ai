"""
راوتر لوحة تحكّم الأدمن — مقيّد لـ role='admin' فقط.
كلّ الـ endpoints هنا مُحميّة تلقائياً عبر require_admin.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(user: User = Depends(get_current_user)):
    """يرفض الوصول لأيّ مستخدم ليس role='admin'."""
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="ممنوع — هذا المسار للأدمن فقط"
        )
    return user


def _safe_count(db: Session, sql: str, params: dict = None) -> int:
    """يعدّ الصفوف بأمان — يُرجع 0 إن كان الجدول أو العمود غير موجود."""
    try:
        result = db.execute(text(sql), params or {}).scalar()
        return int(result or 0)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return 0


@router.get("/stats/overview")
def stats_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """يُرجع كلّ إحصائيات المنصّة في طلب واحد."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    day_ago = now - timedelta(days=1)

    return {
        "users": {
            "total": _safe_count(db, "SELECT COUNT(*) FROM users"),
            "verified": _safe_count(db, "SELECT COUNT(*) FROM users WHERE is_verified = true"),
            "new_this_week": _safe_count(db, "SELECT COUNT(*) FROM users WHERE created_at >= :d", {"d": week_ago}),
            "new_today": _safe_count(db, "SELECT COUNT(*) FROM users WHERE created_at >= :d", {"d": day_ago}),
        },
        "organizations": {
            "total": _safe_count(db, "SELECT COUNT(*) FROM organizations"),
        },
        "projects": {
            "total": _safe_count(db, "SELECT COUNT(*) FROM projects"),
        },
        "scans": {
            "total": _safe_count(db, "SELECT COUNT(*) FROM scans"),
            "today": _safe_count(db, "SELECT COUNT(*) FROM scans WHERE created_at >= :d", {"d": day_ago}),
            "this_week": _safe_count(db, "SELECT COUNT(*) FROM scans WHERE created_at >= :d", {"d": week_ago}),
            "completed": _safe_count(db, "SELECT COUNT(*) FROM scans WHERE status = 'completed'"),
            "running": _safe_count(db, "SELECT COUNT(*) FROM scans WHERE status = 'running'"),
            "failed": _safe_count(db, "SELECT COUNT(*) FROM scans WHERE status = 'failed'"),
        },
        "findings": {
            "total": _safe_count(db, "SELECT COUNT(*) FROM findings"),
            "critical": _safe_count(db, "SELECT COUNT(*) FROM findings WHERE severity = 'critical'"),
            "high": _safe_count(db, "SELECT COUNT(*) FROM findings WHERE severity = 'high'"),
            "medium": _safe_count(db, "SELECT COUNT(*) FROM findings WHERE severity = 'medium'"),
            "low": _safe_count(db, "SELECT COUNT(*) FROM findings WHERE severity = 'low'"),
            "info": _safe_count(db, "SELECT COUNT(*) FROM findings WHERE severity = 'info'"),
        },
        "subscriptions": {
            "free": _safe_count(db, "SELECT COUNT(*) FROM users WHERE subscription_plan IS NULL OR subscription_plan = 'free'"),
            "pro": _safe_count(db, "SELECT COUNT(*) FROM users WHERE subscription_plan = 'pro'"),
            "enterprise": _safe_count(db, "SELECT COUNT(*) FROM users WHERE subscription_plan = 'enterprise'"),
        },
        "generated_at": now.isoformat(),
    }


@router.get("/stats/user-growth")
def user_growth(
    days: int = 30,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """عدد المستخدمين الجدد يومياً آخر N يوم."""
    try:
        cutoff = datetime.utcnow() - timedelta(days=days)
        rows = db.execute(
            text("""
                SELECT DATE(created_at) AS day, COUNT(*) AS count
                FROM users
                WHERE created_at >= :cutoff
                GROUP BY DATE(created_at)
                ORDER BY day ASC
            """),
            {"cutoff": cutoff},
        ).fetchall()
        return [{"day": str(r[0]), "count": int(r[1])} for r in rows]
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return []









        # ==========================
# User Management
# ==========================

@router.get("/users")
def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    verified: Optional[bool] = None,
    plan: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """قائمة المستخدمين مع بحث وفلاتر."""
    query = db.query(User)

    if search:
        s = f"%{search}%"
        query = query.filter((User.username.ilike(s)) | (User.email.ilike(s)))
    if role:
        query = query.filter(User.role == role)
    if verified is not None:
        query = query.filter(User.is_verified == verified)
    if plan:
        try:
            query = query.filter(User.subscription_plan == plan)
        except Exception:
            pass

    total = query.count()
    users = query.order_by(User.id.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "is_verified": bool(getattr(u, "is_verified", False)),
                "subscription_plan": getattr(u, "subscription_plan", None) or "free",
                "created_at": u.created_at.isoformat() if getattr(u, "created_at", None) else None,
                "organization_id": getattr(u, "organization_id", None),
            }
            for u in users
        ],
    }


class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_verified: Optional[bool] = None
    subscription_plan: Optional[str] = None


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """تحديث حقول المستخدم (دور/تفعيل/خطّة)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    if user.id == admin.id and data.role is not None and data.role != "admin":
        raise HTTPException(status_code=400, detail="لا يمكنك تخفيض دورك أنت")

    if data.role is not None and user.role == "admin" and data.role != "admin":
        other_admins = db.query(User).filter(User.role == "admin", User.id != user.id).count()
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="لا يمكن تخفيض آخر أدمن على المنصّة")

    if data.role is not None:
        user.role = data.role
    if data.is_verified is not None:
        user.is_verified = data.is_verified
    if data.subscription_plan is not None:
        try:
            user.subscription_plan = data.subscription_plan
        except Exception:
            pass

    db.commit()
    return {"message": "تمّ التحديث بنجاح", "user_id": user_id}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """حذف مستخدم مع كلّ بياناته."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="لا يمكنك حذف نفسك")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    if user.role == "admin":
        other_admins = db.query(User).filter(User.role == "admin", User.id != user.id).count()
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="لا يمكن حذف آخر أدمن على المنصّة")

    username = user.username

    def safe_execute(sql: str, params: dict):
        try:
            db.execute(text(sql), params)
            db.commit()
        except Exception:
            db.rollback()

    safe_execute(
        "DELETE FROM findings WHERE scan_id IN "
        "(SELECT s.id FROM scans s JOIN projects p ON s.project_id = p.id WHERE p.owner_id = :uid)",
        {"uid": user_id},
    )
    safe_execute(
        "DELETE FROM scans WHERE project_id IN (SELECT id FROM projects WHERE owner_id = :uid)",
        {"uid": user_id},
    )
    safe_execute("DELETE FROM projects WHERE owner_id = :uid", {"uid": user_id})

    for tbl, col in [
        ("activities", "user_id"),
        ("subscriptions", "user_id"),
        ("organization_members", "user_id"),
        ("ai_analyses", "user_id"),
        ("reports", "user_id"),
    ]:
        safe_execute(f"DELETE FROM {tbl} WHERE {col} = :uid", {"uid": user_id})

    try:
        db.delete(user)
        db.commit()
        return {"message": f"تمّ حذف المستخدم {username}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"فشل الحذف: {str(e)[:200]}")


@router.get("/users/{user_id}/activity")
def user_activity(
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """آخر نشاطات المستخدم."""
    try:
        rows = db.execute(
            text("""
                SELECT id, action, details, created_at
                FROM activities
                WHERE user_id = :uid
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"uid": user_id, "limit": limit},
        ).fetchall()
        return [
            {"id": r[0], "action": r[1], "description": r[2] or "", "created_at": str(r[3]) if r[3] else None}
            for r in rows
        ]
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return []


# ==========================
# Activity Log (Global)
# ==========================

@router.get("/activity")
def get_all_activity(
    limit: int = 100,
    offset: int = 0,
    action: str | None = None,
    user_id: int | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """سجلّ النشاط العامّ لكلّ النظام (admin only)."""
    try:
        where_clauses = []
        params: dict = {"limit": limit, "offset": offset}

        if action:
            where_clauses.append("a.action = :action")
            params["action"] = action
        if user_id:
            where_clauses.append("a.user_id = :user_id")
            params["user_id"] = user_id
        if search:
            where_clauses.append("(a.details ILIKE :search OR a.username ILIKE :search OR a.action ILIKE :search)")
            params["search"] = f"%{search}%"
        if date_from:
            where_clauses.append("a.created_at >= :date_from")
            params["date_from"] = date_from
        if date_to:
            where_clauses.append("a.created_at <= :date_to")
            params["date_to"] = date_to

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        total_row = db.execute(
            text(f"SELECT COUNT(*) FROM activities a {where_sql}"),
            params,
        ).fetchone()
        total = total_row[0] if total_row else 0

        rows = db.execute(
            text(f"""
                SELECT a.id, a.action, a.details, a.created_at,
                       a.user_id, a.username
                FROM activities a
                {where_sql}
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        ).fetchall()

        activities = [
            {
                "id": r[0],
                "action": r[1],
                "details": r[2] or "",
                "created_at": str(r[3]) if r[3] else None,
                "user_id": r[4],
                "username": r[5] or "—",
            }
            for r in rows
        ]

        actions_rows = db.execute(
            text("SELECT DISTINCT action FROM activities WHERE action IS NOT NULL ORDER BY action")
        ).fetchall()
        action_types = [r[0] for r in actions_rows]

        return {
            "total": total,
            "activities": activities,
            "action_types": action_types,
        }
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل جلب السجلّ: {str(e)[:200]}")


@router.get("/activity/stats")
def activity_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """إحصائيّات سريعة علا النشاط."""
    try:
        total = db.execute(text("SELECT COUNT(*) FROM activities")).scalar() or 0
        last_24h = db.execute(
            text("SELECT COUNT(*) FROM activities WHERE created_at >= NOW() - INTERVAL '24 hours'")
        ).scalar() or 0
        last_7d = db.execute(
            text("SELECT COUNT(*) FROM activities WHERE created_at >= NOW() - INTERVAL '7 days'")
        ).scalar() or 0
        last_30d = db.execute(
            text("SELECT COUNT(*) FROM activities WHERE created_at >= NOW() - INTERVAL '30 days'")
        ).scalar() or 0

        by_action_rows = db.execute(
            text("""
                SELECT action, COUNT(*) as cnt
                FROM activities
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY action
                ORDER BY cnt DESC
                LIMIT 10
            """)
        ).fetchall()

        return {
            "total": total,
            "last_24h": last_24h,
            "last_7d": last_7d,
            "last_30d": last_30d,
            "by_action": [{"action": r[0], "count": r[1]} for r in by_action_rows],
        }
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return {"total": 0, "last_24h": 0, "last_7d": 0, "last_30d": 0, "by_action": []}


        # ==========================
# Organizations Management
# ==========================

@router.get("/organizations")
def list_organizations(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """قائمة المنظّمات مع إحصائيات."""
    try:
        q = "SELECT id, name, owner_id, plan, created_at FROM organizations"
        params: dict = {}
        conds = []
        if search:
            conds.append("name ILIKE :s")
            params["s"] = f"%{search}%"
        if plan:
            conds.append("plan = :p")
            params["p"] = plan
        if conds:
            q += " WHERE " + " AND ".join(conds)
        q += " ORDER BY id DESC"

        rows = db.execute(text(q), params).fetchall()
        orgs = []
        for r in rows:
            oid = r[0]
            member_count = _safe_count(db, "SELECT COUNT(*) FROM users WHERE organization_id = :o", {"o": oid})
            project_count = _safe_count(db, "SELECT COUNT(*) FROM projects WHERE organization_id = :o", {"o": oid})
            scan_count = _safe_count(db,
                "SELECT COUNT(*) FROM scans s JOIN projects p ON s.project_id = p.id WHERE p.organization_id = :o",
                {"o": oid}
            )
            owner_name = ""
            try:
                owner_row = db.execute(
                    text("SELECT username FROM users WHERE id = :uid"),
                    {"uid": r[2]}
                ).fetchone()
                owner_name = owner_row[0] if owner_row else "—"
            except Exception:
                db.rollback()

            orgs.append({
                "id": oid,
                "name": r[1],
                "owner_id": r[2],
                "owner_name": owner_name,
                "plan": r[3] or "free",
                "created_at": str(r[4]) if r[4] else None,
                "member_count": member_count,
                "project_count": project_count,
                "scan_count": scan_count,
            })

        return {"total": len(orgs), "organizations": orgs}
    except Exception as e:
        try: db.rollback()
        except: pass
        raise HTTPException(status_code=500, detail=f"فشل التحميل: {str(e)[:200]}")


@router.get("/organizations/{org_id}/members")
def organization_members(
    org_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """أعضاء منظّمة معيّنة."""
    try:
        rows = db.execute(
            text("""
                SELECT id, username, email, role, is_verified, org_role, created_at
                FROM users WHERE organization_id = :o
                ORDER BY id DESC
            """),
            {"o": org_id}
        ).fetchall()
        return [
            {
                "id": r[0], "username": r[1], "email": r[2],
                "role": r[3], "is_verified": bool(r[4]),
                "org_role": r[5], "created_at": str(r[6]) if r[6] else None,
            }
            for r in rows
        ]
    except Exception:
        try: db.rollback()
        except: pass
        return []


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None


@router.patch("/organizations/{org_id}")
def update_organization(
    org_id: int,
    data: OrgUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """تعديل اسم المنظّمة أو خطّتها."""
    try:
        updates = []
        params = {"oid": org_id}
        if data.name is not None:
            updates.append("name = :n")
            params["n"] = data.name
        if data.plan is not None:
            updates.append("plan = :p")
            params["p"] = data.plan

        if not updates:
            raise HTTPException(status_code=400, detail="لا شيء للتعديل")

        db.execute(
            text(f"UPDATE organizations SET {', '.join(updates)} WHERE id = :oid"),
            params
        )
        db.commit()

        # تحديث خطّة الاشتراك لكل أعضاء المنظّمة لو تغيّرت الخطّة
        if data.plan is not None:
            try:
                db.execute(
                    text("UPDATE users SET subscription_plan = :p WHERE organization_id = :o"),
                    {"p": data.plan, "o": org_id}
                )
                db.commit()
            except Exception:
                db.rollback()

        return {"message": "تمّ التحديث", "org_id": org_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"فشل التحديث: {str(e)[:200]}")


@router.delete("/organizations/{org_id}")
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """حذف منظّمة مع كلّ مشاريعها وفحوصها.
    الأعضاء لن يُحذفوا — فقط ستُفصل عضويّتهم عن المنظّمة."""
    try:
        row = db.execute(
            text("SELECT name FROM organizations WHERE id = :o"),
            {"o": org_id}
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="المنظّمة غير موجودة")
        org_name = row[0]
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"خطأ: {str(e)[:200]}")

    def safe_execute(sql: str, params: dict):
        try:
            db.execute(text(sql), params)
            db.commit()
        except Exception:
            db.rollback()

    # 1) حذف findings المرتبطة بفحوص مشاريع المنظّمة
    safe_execute(
        "DELETE FROM findings WHERE scan_id IN "
        "(SELECT s.id FROM scans s JOIN projects p ON s.project_id = p.id WHERE p.organization_id = :o)",
        {"o": org_id}
    )
    # 2) حذف الفحوص
    safe_execute(
        "DELETE FROM scans WHERE project_id IN (SELECT id FROM projects WHERE organization_id = :o)",
        {"o": org_id}
    )
    # 3) حذف المشاريع
    safe_execute("DELETE FROM projects WHERE organization_id = :o", {"o": org_id})
    # 4) حذف جدول العضوية
    safe_execute("DELETE FROM organization_members WHERE organization_id = :o", {"o": org_id})
    # 5) فصل الأعضاء (لا نحذفهم)
    safe_execute("UPDATE users SET organization_id = NULL, org_role = NULL WHERE organization_id = :o", {"o": org_id})

    # 6) حذف المنظّمة
    try:
        db.execute(text("DELETE FROM organizations WHERE id = :o"), {"o": org_id})
        db.commit()
        return {"message": f"تمّ حذف منظّمة {org_name}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"فشل الحذف: {str(e)[:200]}")

        # ==========================
# Subscriptions & Revenue
# ==========================

# أسعار الخطط (ممكن تعديلها لاحقاً)
PLAN_PRICES = {
    "free": 0,
    "pro": 29,
    "enterprise": 99,
}


@router.get("/subscriptions")
def list_subscriptions(
    plan: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """قائمة المستخدمين المشتركين مع تفاصيل خطّتهم."""
    try:
        q = """SELECT u.id, u.username, u.email, u.plan,
                      u.is_verified, u.created_at,
                      o.name AS org_name
               FROM users u
               LEFT JOIN organizations o ON u.organization_id = o.id"""
        params: dict = {}
        if plan:
            q += " WHERE u.plan = :p"
            params["p"] = plan
        q += " ORDER BY u.plan DESC, u.id DESC"

        rows = db.execute(text(q), params).fetchall()
        users = [
            {
                "id": r[0],
                "username": r[1],
                "email": r[2],
                "plan": r[3] or "free",
                "is_verified": bool(r[4]),
                "created_at": str(r[5]) if r[5] else None,
                "org_name": r[6] or "—",
                "monthly_price": PLAN_PRICES.get(r[3] or "free", 0),
            }
            for r in rows
        ]
        return {"total": len(users), "users": users}
    except Exception as e:
        try: db.rollback()
        except: pass
        raise HTTPException(status_code=500, detail=f"فشل: {str(e)[:200]}")


@router.get("/subscriptions/revenue")
def revenue_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """إحصائيات الإيرادات التقديرية."""
    free_count = _safe_count(db, "SELECT COUNT(*) FROM users WHERE plan IS NULL OR plan = 'free'")
    pro_count = _safe_count(db, "SELECT COUNT(*) FROM users WHERE plan = 'pro'")
    enterprise_count = _safe_count(db, "SELECT COUNT(*) FROM users WHERE plan = 'enterprise'")

    mrr = (pro_count * PLAN_PRICES["pro"]) + (enterprise_count * PLAN_PRICES["enterprise"])
    arr = mrr * 12
    total_paid = pro_count + enterprise_count
    total_users = free_count + pro_count + enterprise_count

    return {
        "plans": {
            "free": {"count": free_count, "price": PLAN_PRICES["free"], "revenue": 0},
            "pro": {"count": pro_count, "price": PLAN_PRICES["pro"], "revenue": pro_count * PLAN_PRICES["pro"]},
            "enterprise": {"count": enterprise_count, "price": PLAN_PRICES["enterprise"], "revenue": enterprise_count * PLAN_PRICES["enterprise"]},
        },
        "mrr": mrr,
        "arr": arr,
        "total_paid_users": total_paid,
        "total_users": total_users,
        "conversion_rate": round((total_paid / total_users * 100) if total_users else 0, 1),
    }


class PlanUpdate(BaseModel):
    plan: str


@router.patch("/subscriptions/{user_id}")
def update_user_plan(
    user_id: int,
    data: PlanUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """تغيير خطّة اشتراك مستخدم (مثلاً ترقية مجّانية لصديق)."""
    if data.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail=f"خطّة غير صحيحة: {data.plan}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    try:
        user.plan = data.plan
    except Exception:
        pass
    try:
        user.subscription_plan = data.plan
    except Exception:
        pass

    db.commit()
    return {"message": f"تمّ تحديث خطّة {user.username} إلى {data.plan}", "user_id": user_id}


    # ==========================
# Scans Monitoring
# ==========================

@router.get("/scans")
def list_scans(
    limit: int = 50,
    offset: int = 0,
    status: str | None = None,
    scan_type: str | None = None,
    user_id: int | None = None,
    project_id: int | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """جلب كلّ الفحوصات مع فلاتر."""
    try:
        where_clauses = []
        params: dict = {"limit": limit, "offset": offset}

        if status:
            where_clauses.append("s.status = :status")
            params["status"] = status
        if scan_type:
            where_clauses.append("s.scan_type = :scan_type")
            params["scan_type"] = scan_type
        if user_id:
            where_clauses.append("s.owner_id = :user_id")
            params["user_id"] = user_id
        if project_id:
            where_clauses.append("s.project_id = :project_id")
            params["project_id"] = project_id
        if search:
            where_clauses.append("(u.username ILIKE :search OR p.name ILIKE :search OR s.scan_type ILIKE :search)")
            params["search"] = f"%{search}%"
        if date_from:
            where_clauses.append("s.created_at >= :date_from")
            params["date_from"] = date_from
        if date_to:
            where_clauses.append("s.created_at <= :date_to")
            params["date_to"] = date_to

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        total_row = db.execute(
            text(f"""
                SELECT COUNT(*) FROM scans s
                LEFT JOIN users u ON u.id = s.owner_id
                LEFT JOIN projects p ON p.id = s.project_id
                {where_sql}
            """),
            params,
        ).fetchone()
        total = total_row[0] if total_row else 0

        rows = db.execute(
            text(f"""
                SELECT s.id, s.scan_type, s.status, s.findings_count, s.created_at,
                       s.owner_id, u.username, u.email,
                       s.project_id, p.name as project_name
                FROM scans s
                LEFT JOIN users u ON u.id = s.owner_id
                LEFT JOIN projects p ON p.id = s.project_id
                {where_sql}
                ORDER BY s.created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        ).fetchall()

        scans = [
            {
                "id": r[0],
                "scan_type": r[1] or "unknown",
                "status": r[2] or "unknown",
                "findings_count": r[3] or 0,
                "created_at": str(r[4]) if r[4] else None,
                "owner_id": r[5],
                "username": r[6] or "محذوف",
                "email": r[7] or "—",
                "project_id": r[8],
                "project_name": r[9] or "—",
            }
            for r in rows
        ]

        status_rows = db.execute(text("SELECT DISTINCT status FROM scans WHERE status IS NOT NULL ORDER BY status")).fetchall()
        type_rows = db.execute(text("SELECT DISTINCT scan_type FROM scans WHERE scan_type IS NOT NULL ORDER BY scan_type")).fetchall()

        return {
            "total": total,
            "scans": scans,
            "statuses": [r[0] for r in status_rows],
            "scan_types": [r[0] for r in type_rows],
        }
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل جلب الفحوصات: {str(e)[:200]}")


@router.get("/scans/stats")
def scans_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """إحصائيّات الفحوصات."""
    try:
        total = db.execute(text("SELECT COUNT(*) FROM scans")).scalar() or 0
        today = db.execute(
            text("SELECT COUNT(*) FROM scans WHERE created_at >= CURRENT_DATE")
        ).scalar() or 0
        last_7d = db.execute(
            text("SELECT COUNT(*) FROM scans WHERE created_at >= NOW() - INTERVAL '7 days'")
        ).scalar() or 0
        running = db.execute(
            text("SELECT COUNT(*) FROM scans WHERE status IN ('running', 'pending', 'in_progress')")
        ).scalar() or 0
        failed = db.execute(
            text("SELECT COUNT(*) FROM scans WHERE status = 'failed'")
        ).scalar() or 0
        total_findings = db.execute(text("SELECT COUNT(*) FROM findings")).scalar() or 0

        by_status = db.execute(
            text("SELECT status, COUNT(*) FROM scans GROUP BY status ORDER BY COUNT(*) DESC")
        ).fetchall()
        by_type = db.execute(
            text("SELECT scan_type, COUNT(*) FROM scans WHERE scan_type IS NOT NULL GROUP BY scan_type ORDER BY COUNT(*) DESC")
        ).fetchall()
        by_severity = db.execute(
            text("SELECT severity, COUNT(*) FROM findings WHERE severity IS NOT NULL GROUP BY severity ORDER BY COUNT(*) DESC")
        ).fetchall()

        return {
            "total": total,
            "today": today,
            "last_7d": last_7d,
            "running": running,
            "failed": failed,
            "total_findings": total_findings,
            "by_status": [{"status": r[0] or "unknown", "count": r[1]} for r in by_status],
            "by_type": [{"type": r[0], "count": r[1]} for r in by_type],
            "by_severity": [{"severity": r[0], "count": r[1]} for r in by_severity],
        }
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return {"total": 0, "today": 0, "last_7d": 0, "running": 0, "failed": 0,
                "total_findings": 0, "by_status": [], "by_type": [], "by_severity": []}


@router.get("/scans/{scan_id}")
def scan_details(
    scan_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """تفاصيل فحص واحد مع كلّ الثغرات."""
    try:
        scan_row = db.execute(
            text("""
                SELECT s.id, s.scan_type, s.status, s.findings_count, s.created_at,
                       s.owner_id, u.username, u.email,
                       s.project_id, p.name as project_name
                FROM scans s
                LEFT JOIN users u ON u.id = s.owner_id
                LEFT JOIN projects p ON p.id = s.project_id
                WHERE s.id = :sid
            """),
            {"sid": scan_id},
        ).fetchone()

        if not scan_row:
            raise HTTPException(status_code=404, detail="الفحص غير موجود")

        findings_rows = db.execute(
            text("""
                SELECT id, title, severity, description, location, recommendation, created_at
                FROM findings
                WHERE scan_id = :sid
                ORDER BY
                    CASE severity
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                        ELSE 5
                    END,
                    created_at DESC
            """),
            {"sid": scan_id},
        ).fetchall()

        return {
            "scan": {
                "id": scan_row[0],
                "scan_type": scan_row[1] or "unknown",
                "status": scan_row[2] or "unknown",
                "findings_count": scan_row[3] or 0,
                "created_at": str(scan_row[4]) if scan_row[4] else None,
                "owner_id": scan_row[5],
                "username": scan_row[6] or "محذوف",
                "email": scan_row[7] or "—",
                "project_id": scan_row[8],
                "project_name": scan_row[9] or "—",
            },
            "findings": [
                {
                    "id": r[0],
                    "title": r[1],
                    "severity": r[2] or "info",
                    "description": r[3] or "",
                    "location": r[4] or "",
                    "recommendation": r[5] or "",
                    "created_at": str(r[6]) if r[6] else None,
                }
                for r in findings_rows
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل الجلب: {str(e)[:200]}")


@router.post("/scans/{scan_id}/cancel")
def cancel_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """إلغاء فحص عالق يدويًّا."""
    try:
        row = db.execute(text("SELECT status FROM scans WHERE id = :sid"), {"sid": scan_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الفحص غير موجود")
        if row[0] not in ("running", "pending", "in_progress"):
            raise HTTPException(status_code=400, detail=f"لا يمكن إلغاء فحص بحالة: {row[0]}")

        db.execute(text("UPDATE scans SET status = 'cancelled' WHERE id = :sid"), {"sid": scan_id})
        db.commit()
        return {"ok": True, "message": "تمّ إلغاء الفحص"}
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل الإلغاء: {str(e)[:200]}")


@router.delete("/scans/{scan_id}")
def delete_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """حذف فحص وكلّ ثغراته."""
    try:
        row = db.execute(text("SELECT id FROM scans WHERE id = :sid"), {"sid": scan_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الفحص غير موجود")

        db.execute(text("DELETE FROM findings WHERE scan_id = :sid"), {"sid": scan_id})
        db.commit()
        db.execute(text("DELETE FROM scans WHERE id = :sid"), {"sid": scan_id})
        db.commit()
        return {"ok": True, "message": "تمّ الحذف"}
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل الحذف: {str(e)[:200]}")

        # ==========================
# System Settings
# ==========================

@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """جلب كلّ إعدادات النظام مجمّعة حسب الفئة."""
    try:
        rows = db.execute(
            text("""
                SELECT key, value, category, description, updated_at
                FROM system_settings
                ORDER BY category, key
            """)
        ).fetchall()

        grouped: dict = {}
        for r in rows:
            cat = r[2] or "other"
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append({
                "key": r[0],
                "value": r[1] or "",
                "category": cat,
                "description": r[3] or "",
                "updated_at": str(r[4]) if r[4] else None,
            })

        return {"settings": grouped}
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل الجلب: {str(e)[:200]}")


@router.patch("/settings")
def update_settings(
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """تحديث مجموعة إعدادات دفعة واحدة.
    
    Body: {"platform_name": "جديد", "maintenance_mode": "true", ...}
    """
    try:
        if not isinstance(payload, dict) or not payload:
            raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")

        updated_keys = []
        for key, value in payload.items():
            # تحقّق أنّ المفتاح موجود (أمان)
            exists = db.execute(
                text("SELECT 1 FROM system_settings WHERE key = :k"),
                {"k": key}
            ).fetchone()

            if not exists:
                continue

            db.execute(
                text("""
                    UPDATE system_settings
                    SET value = :v, updated_at = NOW(), updated_by = :uid
                    WHERE key = :k
                """),
                {"v": str(value), "k": key, "uid": admin.id}
            )
            updated_keys.append(key)

        db.commit()

        return {"ok": True, "updated": updated_keys, "count": len(updated_keys)}
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل التحديث: {str(e)[:200]}")


@router.get("/settings/public")
def get_public_settings(db: Session = Depends(get_db)):
    """إعدادات عامّة متاحة بدون أدمن (مثل maintenance_mode، platform_name)."""
    try:
        rows = db.execute(
            text("""
                SELECT key, value FROM system_settings
                WHERE key IN ('platform_name', 'platform_logo', 'maintenance_mode', 'maintenance_message')
            """)
        ).fetchall()
        return {r[0]: r[1] or "" for r in rows}
    except Exception:
        return {}


        # ==========================
# Announcements
# ==========================

@router.get("/announcements")
def list_announcements(
    limit: int = 50,
    offset: int = 0,
    is_active: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """جلب كلّ الإعلانات."""
    try:
        where = []
        params: dict = {"limit": limit, "offset": offset}

        if is_active is not None:
            where.append("a.is_active = :is_active")
            params["is_active"] = is_active
        if search:
            where.append("(a.title ILIKE :search OR a.message ILIKE :search)")
            params["search"] = f"%{search}%"

        where_sql = ("WHERE " + " AND ".join(where)) if where else ""

        total = db.execute(
            text(f"SELECT COUNT(*) FROM announcements a {where_sql}"),
            params
        ).scalar() or 0

        rows = db.execute(
            text(f"""
                SELECT a.id, a.title, a.message, a.type, a.target,
                       a.is_active, a.scheduled_at, a.expires_at,
                       a.created_by, u.username, a.created_at,
                       (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = a.id) as reads
                FROM announcements a
                LEFT JOIN users u ON u.id = a.created_by
                {where_sql}
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params
        ).fetchall()

        return {
            "total": total,
            "announcements": [
                {
                    "id": r[0],
                    "title": r[1],
                    "message": r[2],
                    "type": r[3] or "info",
                    "target": r[4] or "all",
                    "is_active": r[5],
                    "scheduled_at": str(r[6]) if r[6] else None,
                    "expires_at": str(r[7]) if r[7] else None,
                    "created_by": r[8],
                    "created_by_username": r[9] or "محذوف",
                    "created_at": str(r[10]) if r[10] else None,
                    "reads_count": r[11] or 0,
                }
                for r in rows
            ]
        }
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل الجلب: {str(e)[:200]}")


@router.get("/announcements/stats")
def announcements_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """إحصائيّات الإعلانات."""
    try:
        total = db.execute(text("SELECT COUNT(*) FROM announcements")).scalar() or 0
        active = db.execute(text("SELECT COUNT(*) FROM announcements WHERE is_active = TRUE")).scalar() or 0
        total_reads = db.execute(text("SELECT COUNT(*) FROM announcement_reads")).scalar() or 0
        scheduled = db.execute(
            text("SELECT COUNT(*) FROM announcements WHERE scheduled_at > NOW() AND is_active = TRUE")
        ).scalar() or 0

        return {
            "total": total,
            "active": active,
            "total_reads": total_reads,
            "scheduled": scheduled,
        }
    except Exception:
        return {"total": 0, "active": 0, "total_reads": 0, "scheduled": 0}


@router.post("/announcements")
def create_announcement(
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """إنشاء إعلان جديد.
    
    Body: {
        "title": "...", "message": "...",
        "type": "info|warning|success|danger",
        "target": "all|plan:pro|plan:enterprise|role:admin",
        "scheduled_at": "2026-10-05T12:00:00" (optional),
        "expires_at": "2026-10-20T00:00:00" (optional),
        "is_active": true
    }
    """
    try:
        title = (payload.get("title") or "").strip()
        message = (payload.get("message") or "").strip()
        if not title or not message:
            raise HTTPException(status_code=400, detail="العنوان والرسالة مطلوبان")

        atype = payload.get("type") or "info"
        if atype not in ("info", "warning", "success", "danger"):
            atype = "info"

        target = payload.get("target") or "all"
        scheduled_at = payload.get("scheduled_at") or None
        expires_at = payload.get("expires_at") or None
        is_active = bool(payload.get("is_active", True))

        row = db.execute(
            text("""
                INSERT INTO announcements
                    (title, message, type, target, is_active, scheduled_at, expires_at, created_by)
                VALUES (:title, :message, :type, :target, :is_active, :scheduled_at, :expires_at, :created_by)
                RETURNING id
            """),
            {
                "title": title, "message": message, "type": atype, "target": target,
                "is_active": is_active, "scheduled_at": scheduled_at,
                "expires_at": expires_at, "created_by": admin.id,
            }
        ).fetchone()
        db.commit()

        return {"ok": True, "id": row[0] if row else None}
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل الإنشاء: {str(e)[:200]}")


@router.patch("/announcements/{announcement_id}")
def update_announcement(
    announcement_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """تحديث إعلان."""
    try:
        exists = db.execute(
            text("SELECT 1 FROM announcements WHERE id = :id"),
            {"id": announcement_id}
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="الإعلان غير موجود")

        fields = []
        params: dict = {"id": announcement_id}

        for key in ("title", "message", "type", "target", "is_active", "scheduled_at", "expires_at"):
            if key in payload:
                fields.append(f"{key} = :{key}")
                params[key] = payload[key]

        if not fields:
            return {"ok": True, "message": "لا شيء للتحديث"}

        db.execute(
            text(f"UPDATE announcements SET {', '.join(fields)} WHERE id = :id"),
            params
        )
        db.commit()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل التحديث: {str(e)[:200]}")


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """حذف إعلان."""
    try:
        exists = db.execute(
            text("SELECT 1 FROM announcements WHERE id = :id"),
            {"id": announcement_id}
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="الإعلان غير موجود")

        db.execute(text("DELETE FROM announcements WHERE id = :id"), {"id": announcement_id})
        db.commit()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل الحذف: {str(e)[:200]}")