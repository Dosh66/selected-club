console.log("🚀 NEW WEBHOOK VERSION LIVE");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  console.log("🔥 WEBHOOK HIT");

  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body, "utf8");

    stripeEvent = stripe.webhooks.constructEvent(
      body,
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

    if (!lineItems.data.length) {
      console.log("❌ No line items found");
      return {
        statusCode: 200,
        body: "No items",
      };
    }

    const quantity = lineItems.data[0].quantity;
    const priceId = lineItems.data[0].price.id;

    console.log("✅ Payment received:", priceId, quantity);

    // =========================
    // 🟡 MAIN DRAW (£6)
    // =========================
    if (priceId === "price_1TGyxX0JuSOSCs9W2yPqByNz") {
      const { data, error } = await supabase
        .from("main_draw")
        .select("*")
        .eq("is_closed", false)
        .single();

      if (error || !data) {
        console.log("❌ Main draw fetch error:", error);
        return {
          statusCode: 500,
          body: "Main draw fetch failed",
        };
      }

      let newTotal = data.total_entries + quantity;

      if (newTotal >= data.max_entries) {
        newTotal = data.max_entries;

        const { error: updateError } = await supabase
          .from("main_draw")
          .update({
            total_entries: newTotal,
            is_closed: true,
          })
          .eq("id", data.id);

        if (updateError) {
          console.log("❌ Main draw sold out update error:", updateError);
          return {
            statusCode: 500,
            body: "Main draw update failed",
          };
        }

        console.log("🎯 MAIN DRAW SOLD OUT");

        return {
          statusCode: 200,
          body: "ok",
        };
      }

      const { error: updateError } = await supabase
        .from("main_draw")
        .update({ total_entries: newTotal })
        .eq("id", data.id);

      if (updateError) {
        console.log("❌ Main draw normal update error:", updateError);
        return {
          statusCode: 500,
          body: "Main draw update failed",
        };
      }
    }

    // =========================
    // 🔵 SELECTED DROP (£3)
    // =========================
    if (priceId === "price_1TGyzo0JuSOSCs9WnEZ1WYca") {
      const { data, error } = await supabase
        .from("drops")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error || !data) {
        console.log("❌ Drop fetch error:", error);
        return {
          statusCode: 500,
          body: "Drop fetch failed",
        };
      }

      console.log("🆔 ACTIVE DROP ID:", data.id);

      let newTotal = data.total_entries + quantity;

      console.log("🎟️ New total entries:", newTotal);
      console.log("🎯 Trigger number:", data.trigger_number);

      if (newTotal >= data.trigger_number) {
        newTotal = data.trigger_number;

        const winnerNumber = Math.floor(Math.random() * newTotal) + 1;

        console.log("🏆 WINNER NUMBER:", winnerNumber);

        const { error: closeError } = await supabase
          .from("drops")
          .update({
            total_entries: newTotal,
            winner_number: winnerNumber,
            is_active: false,
            is_closed: true,
          })
          .eq("id", data.id);

        if (closeError) {
          console.log("❌ DROP CLOSE ERROR:", closeError);
          return {
            statusCode: 500,
            body: "Drop close failed",
          };
        }

        console.log("🎉 DROP CLOSED");

        const newTrigger =
          Math.floor(Math.random() * (120 - 80 + 1)) + 80;

        console.log("🎯 New trigger generated:", newTrigger);

        const { error: insertError } = await supabase
          .from("drops")
          .insert([
            {
              total_entries: 0,
              trigger_number: newTrigger,
              is_active: true,
              is_closed: false,
            },
          ]);

        if (insertError) {
          console.log("❌ NEW DROP INSERT ERROR:", insertError);
          return {
            statusCode: 500,
            body: "New drop insert failed",
          };
        }

        console.log("🔁 NEW DROP CREATED");

        return {
          statusCode: 200,
          body: "ok",
        };
      }

      const { error: updateError } = await supabase
        .from("drops")
        .update({ total_entries: newTotal })
        .eq("id", data.id);

      if (updateError) {
        console.log("❌ DROP NORMAL UPDATE ERROR:", updateError);
        return {
          statusCode: 500,
          body: "Drop update failed",
        };
      }
    }
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};
