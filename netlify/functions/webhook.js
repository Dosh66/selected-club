console.log("🚀 NEW WEBHOOK VERSION LIVE");
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
    console.log("❌ Webhook signature error:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

    const quantity = lineItems.data[0].quantity;
    const priceId = lineItems.data[0].price.id;

    console.log("✅ Payment received:", priceId, quantity);

    // =========================
    // MAIN DRAW (£6)
    // =========================
    if (priceId === "price_1TGyxX0JuSOSCs9W2yPqByNz") {
      const { data } = await supabase
        .from("main_draw")
        .select("*")
        .eq("is_closed", false)
        .single();

      if (!data) return;

      const newTotal = data.total_entries + quantity;

      await supabase
        .from("main_draw")
        .update({ total_entries: newTotal })
        .eq("id", data.id);
    }

    // =========================
    // SELECTED DROP (£3)
    // =========================
    if (priceId === "price_1TGyzo0JuSOSCs9WnEZ1WYca") {
      const { data } = await supabase
        .from("drops")
        .select("*")
        .eq("is_active", true)
        .single();

      if (!data) return;

      const newTotal = data.total_entries + quantity;

      await supabase
        .from("drops")
        .update({ total_entries: newTotal })
        .eq("id", data.id);
    }
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};
