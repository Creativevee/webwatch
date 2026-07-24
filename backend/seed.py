from passlib.context import CryptContext

from database import Base, SessionLocal, engine
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(models.User).filter_by(username="admin").first()
        if existing:
            print("Admin user already exists, skipping.")
            return

        admin = models.User(
            username="admin",
            email="admin@webwatch.local",
            hashed_password=pwd_context.hash("admin123"),
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("Admin user created: admin / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
