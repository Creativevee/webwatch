from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from engines.file_monitor import scan_folder, update_baseline
import models
import schemas
from routers.auth import get_current_user

router = APIRouter(prefix="/api/folders", tags=["folders"])


@router.post("", response_model=schemas.WebFolderRead)
def create_folder(
    folder: schemas.WebFolderCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_folder = models.WebFolder(
        owner_id=current_user.id,
        name=folder.name,
        path=folder.path,
    )
    db.add(new_folder)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="A folder with this path already exists"
        )

    db.refresh(new_folder)
    return new_folder


@router.get("", response_model=list[schemas.WebFolderRead])
def list_folders(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    folders = db.query(models.WebFolder).filter_by(owner_id=current_user.id).all()
    return folders


@router.delete("/{folder_id}")
def delete_folder(
    folder_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    folder = db.query(models.WebFolder).filter_by(
        id=folder_id, owner_id=current_user.id
    ).first()

    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")

    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted"}


@router.post("/{folder_id}/rebuild")
def rebuild_folder_baseline(
    folder_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    folder = db.query(models.WebFolder).filter_by(
        id=folder_id, owner_id=current_user.id
    ).first()

    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")

    current_hashes = scan_folder(folder.path)
    update_baseline(folder_id=folder.id, current_hashes=current_hashes, db=db)

    return {"message": "Baseline rebuilt", "files_scanned": len(current_hashes)}
