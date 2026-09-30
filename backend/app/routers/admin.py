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