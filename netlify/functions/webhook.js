const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // ✅ Only run when payment succeeds
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    // 🔥 Get Stripe data (ONLY ONCE)
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const quantity = lineItems.data[0].quantity;
    const priceId = lineItems.data[0].price.id;

    // ===== MAIN DRAW =====
    if (priceId === "price_1TGyxX0JuSOSCs9W2yPqByNz") {
      await supabase
        .from("main_draw")
        .update({
          total_entries: supabase.raw(`total_entries + ${quantity}`)
        })
        .eq("is_closed", false);
    }

    // ===== SELECTED DROP =====
    if (priceId === "price_1TGyzo0JuSOSCs9WnEZ1WYca") {
      await supabase
        .from("drops")
        .update({
          total_entries: supabase.raw(`total_entries + ${quantity}`)
        })
        .eq("is_active", true);
    }
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};
