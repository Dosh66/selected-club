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

    const dropQty = parseInt(session.metadata.dropQty || 0);

    if (dropQty > 0) {
      const { data } = await supabase
        .from("entries")
        .select("*")
        .single();

      let newTotal = data.total_entries + dropQty;

      if (newTotal >= data.trigger_number) {
        const newTrigger = Math.floor(Math.random() * 41) + 80;

        await supabase
          .from("entries")
          .update({
            total_entries: 0,
            trigger_number: newTrigger,
          })
          .eq("id", data.id);
      } else {
        await supabase
          .from("entries")
          .update({
            total_entries: newTotal,
          })
          .eq("id", data.id);
      }
    }
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};
