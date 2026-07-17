import mongoose from "mongoose";

const { Schema } = mongoose;

const cartItemSchema = new Schema({
  itemType: { 
    type: String, 
    enum: ["Course", "Mentor", "Subscription"], 
    required: true 
  },
  itemId: { 
    type: Schema.Types.ObjectId, 
    required: true,
    // Note: refPath is not fully supported for populate if we have multiple types unless configured carefully, 
    // but for simple data storage this is sufficient. We can manually fetch details.
    refPath: 'itemType'
  },
  title: { type: String, required: true }, // Store snapshot of title
  price: { type: Number, required: true }, // Store snapshot of price at add time
  quantity: { type: Number, default: 1, min: 1 },
  thumbnail: { type: String, default: "" }, // Optional image
}, { _id: true }); // Give each item its own _id

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema],
  },
  { collection: "carts", timestamps: true }
);

export const Cart = mongoose.models.Cart ?? mongoose.model("Cart", cartSchema);
