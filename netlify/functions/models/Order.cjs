const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerEmail: {
    type: String,
    required: true
  },

  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },

      name: String,
      price: Number,
      fileUrl: String
    }
  ],

  totalPrice: {
    type: Number,
    default: 0
  },

  downloadSent: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports =
  mongoose.models.Order || mongoose.model("Order", orderSchema);