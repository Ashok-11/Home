"""Appliance service tracker — when was the geyser last serviced, what's due."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING, DESCENDING

from lib.db import db
from lib.dates import today_iso
from lib.session import require_user
from models.service import (
    Appliance,
    ApplianceCreate,
    ApplianceWithStatus,
    ServiceRecord,
    ServiceRecordCreate,
)

router = APIRouter(tags=["service"])


def add_months(iso: str, months: int) -> str:
    d = datetime.strptime(iso, "%Y-%m-%d")
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                      31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return f"{year}-{month:02d}-{day:02d}"


@router.get("/appliances", response_model=list[ApplianceWithStatus])
async def list_appliances(house_id: str | None = None, _: dict = Depends(require_user)):
    query = {"house_id": house_id} if house_id else {}
    docs = await db.appliances.find(query).sort([("created_at", ASCENDING)]).to_list(300)
    today = today_iso()
    out: list[ApplianceWithStatus] = []
    for doc in docs:
        records = (
            await db.service_records.find({"appliance_id": doc["id"]})
            .sort([("date", DESCENDING)])
            .to_list(100)
        )
        last = doc.get("last_serviced_on") or (records[0]["date"] if records else None)
        next_due = add_months(last, doc.get("service_interval_months", 6)) if last else None
        out.append(
            ApplianceWithStatus(
                **{**doc, "last_serviced_on": last},
                next_due=next_due,
                overdue=bool(next_due and next_due < today),
                records=[ServiceRecord(**r) for r in records],
            )
        )
    return out


@router.post("/appliances", response_model=Appliance, status_code=201)
async def create_appliance(body: ApplianceCreate, _: dict = Depends(require_user)):
    doc = Appliance(**body.model_dump())
    await db.appliances.insert_one(doc.model_dump())
    return doc


@router.put("/appliances/{appliance_id}", response_model=Appliance)
async def update_appliance(appliance_id: str, body: ApplianceCreate, _: dict = Depends(require_user)):
    doc = await db.appliances.find_one({"id": appliance_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Appliance not found")
    updates = body.model_dump()
    await db.appliances.update_one({"id": appliance_id}, {"$set": updates})
    doc.update(updates)
    return Appliance(**doc)


@router.delete("/appliances/{appliance_id}", status_code=204)
async def delete_appliance(appliance_id: str, _: dict = Depends(require_user)):
    result = await db.appliances.delete_one({"id": appliance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appliance not found")
    await db.service_records.delete_many({"appliance_id": appliance_id})


@router.post("/appliances/{appliance_id}/services", response_model=ServiceRecord, status_code=201)
async def add_service(appliance_id: str, body: ServiceRecordCreate, _: dict = Depends(require_user)):
    appliance = await db.appliances.find_one({"id": appliance_id})
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    doc = ServiceRecord(appliance_id=appliance_id, **body.model_dump())
    await db.service_records.insert_one(doc.model_dump())
    # keep the appliance's last-serviced date in step with its newest record
    if not appliance.get("last_serviced_on") or body.date > appliance["last_serviced_on"]:
        await db.appliances.update_one({"id": appliance_id}, {"$set": {"last_serviced_on": body.date}})
    return doc


@router.delete("/services/{record_id}", status_code=204)
async def delete_service(record_id: str, _: dict = Depends(require_user)):
    result = await db.service_records.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service record not found")
