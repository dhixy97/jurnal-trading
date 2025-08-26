import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("trading");
    const trades = await db.collection("trades").find({}).sort({ createdAt: 1 }).toArray();
    return new Response(JSON.stringify(trades), { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const client = await clientPromise;
    const db = client.db("trading");
    const trade = { ...data, createdAt: new Date() };
    const result = await db.collection("trades").insertOne(trade);
    return new Response(JSON.stringify({ ...trade, _id: result.insertedId }), { status: 201 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    const client = await clientPromise;
    const db = client.db("trading");
    await db.collection("trades").deleteOne({ _id: new ObjectId(id) });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
