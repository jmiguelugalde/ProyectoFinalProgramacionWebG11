# backend/routers/users.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/users", tags=["users"])

# ----------- MODELOS -----------
class UserBase(BaseModel):
    username: str
    email: str
    role: str
    active: bool

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

# ----------- DB CONNECTION -----------
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        database=os.getenv("DB_NAME")
    )

# ----------- RUTAS -----------
@router.get("/", response_model=List[UserOut])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, username, email, role, active FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users

@router.post("/", response_model=UserOut)
def create_user(user: UserCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (username, email, password, role, active) VALUES (%s,%s,%s,%s,%s)",
        (user.username, user.email, user.password, user.role, user.active),
    )
    conn.commit()
    new_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return {**user.dict(), "id": new_id}
