import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.models import User, Business, BusinessMembership

# Use in-memory SQLite for blazing fast isolated testing
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_setup(db_session):
    """Seed test user and business workspace."""
    user = User(
        email="testowner@example.com",
        hashed_password="hashed_pw_test",
        full_name="Test Owner",
        is_active=True
    )
    db_session.add(user)
    db_session.flush()

    business = Business(
        name="Test Mart",
        slug="test-mart",
        currency="INR",
        currency_symbol="₹",
        invoice_prefix="TST-",
        invoice_next_number=1001
    )
    db_session.add(business)
    db_session.flush()

    membership = BusinessMembership(
        user_id=user.id,
        business_id=business.id,
        role="owner",
        is_active=True
    )
    db_session.add(membership)
    db_session.commit()

    token = create_access_token(subject=user.id)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Business-Id": business.id
    }
    return {
        "user": user,
        "business": business,
        "headers": headers,
        "token": token
    }
