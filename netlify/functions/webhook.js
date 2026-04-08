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

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const quantity = parseInt(session.metadata.quantity || 1);

    const { data } = await supabase
      .from("main_draw")
      .select("*")
      .single();

    const currentTotal = data.total_entries;
    const max = data.max_entries;

    // 🚨 HARD STOP
    if (currentTotal >= max) {
      return {
        statusCode: 200,
        body: "Draw already full",
      };
    }

    // 🚨 Prevent oversell
    let newTotal = currentTotal + quantity;
    if (newTotal > max) {
      newTotal = max;
    }

    await supabase
      .from("main_draw")
      .update({
        total_entries: newTotal,
      })
      .eq("id", data.id);
  }

  // ✅ TEMP TEST (REMOVE AFTER)
  const { data } = await supabase
    .from("main_draw")
    .select("*")
    .single();

  await supabase
    .from("main_draw")
    .update({
      total_entries: data.total_entries + 1,
    })
    .eq("id", data.id);

  return {
    statusCode: 200,
    body: "ok",
  };
};
