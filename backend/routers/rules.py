from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from routers.auth import get_current_user

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.post("", response_model=schemas.RuleRead)
def create_rule(
    rule: schemas.RuleCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_rule = models.Rule(
        name=rule.name,
        pattern=rule.pattern,
        severity=rule.severity,
        mitre_technique=rule.mitre_technique,
        description=rule.description,
    )
    db.add(new_rule)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="A rule with this name already exists"
        )

    db.refresh(new_rule)
    return new_rule


@router.get("", response_model=list[schemas.RuleRead])
def list_rules(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Rule).all()


@router.put("/{rule_id}", response_model=schemas.RuleRead)
def update_rule(
    rule_id: int,
    rule_update: schemas.RuleUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rule = db.query(models.Rule).filter_by(id=rule_id).first()

    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")

    updates = rule_update.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(rule, field_name, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="A rule with this name already exists"
        )

    db.refresh(rule)
    return rule


@router.delete("/{rule_id}")
def delete_rule(
    rule_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rule = db.query(models.Rule).filter_by(id=rule_id).first()

    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.delete(rule)
    db.commit()

    return {"message": "Rule deleted"}
