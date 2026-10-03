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
        ("activity_logs", "user_id"),
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
                SELECT id, action, description, created_at
                FROM activity_logs
                WHERE user_id = :uid
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"uid": user_id, "limit": limit},
        ).fetchall()
        return [
            {"id": r[0], "action": r[1], "description": r[2], "created_at": str(r[3])}
            for r in rows
        ]
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return []


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