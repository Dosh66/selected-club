console.log("🚀 NEW WEBHOOK VERSION LIVE");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];

  console.log("🔑 KEY CHECK:", process.env.SUPABASE_SERVICE_KEY?.slice(0, 20));

  let stripeEvent;

  // =========================
  // 🔐 VERIFY STRIPE WEBHOOK
  // =========================
  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body);

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

  // =========================
  // 💳 PAYMENT COMPLETED
  // =========================
  if (stripeEvent.type === "checkout.session.completed") {
    // 🔥 respond immediately to Stripe
    setTimeout(async () => {
      try {
        const session = stripeEvent.data.object;

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

        if (!lineItems.data.length) {
          console.log("❌ No line items found");
          return;
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

          console.log("🧪 MAIN DRAW FETCH:", data);
          console.log("❌ MAIN DRAW FETCH ERROR:", error);

          if (error || !data) return;

          let newTotal = data.total_entries + quantity;

          if (newTotal >= data.max_entries) {
            newTotal = data.max_entries;

            const { data: updateData, error: updateError } = await supabase
              .from("main_draw")
              .update({
                total_entries: newTotal,
                is_closed: true,
              })
              .eq("id", data.id);

            console.log("🧪 MAIN DRAW UPDATE:", updateData);
            console.log("❌ MAIN DRAW UPDATE ERROR:", updateError);

            console.log("🎯 MAIN DRAW SOLD OUT");
            return;
          }

          const { data: updateData, error: updateError } = await supabase
            .from("main_draw")
            .update({ total_entries: newTotal })
            .eq("id", data.id);

          console.log("🧪 MAIN DRAW UPDATE:", updateData);
          console.log("❌ MAIN DRAW UPDATE ERROR:", updateError);
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

          console.log("🧪 DROP FETCH:", data);
          console.log("❌ DROP FETCH ERROR:", error);

          if (error || !data) return;

          let newTotal = data.total_entries + quantity;

          console.log("🎟️ New total entries:", newTotal);
          console.log("🎯 Trigger number:", data.trigger_number);

          // 🎯 TRIGGER HIT
          if (newTotal >= data.trigger_number) {
            newTotal = data.trigger_number;

            const winnerNumber = Math.floor(Math.random() * newTotal) + 1;

            console.log("🏆 WINNER NUMBER:", winnerNumber);

            const { data: closeData, error: closeError } = await supabase
              .from("drops")
              .update({
                total_entries: newTotal,
                winner_number: winnerNumber,
                is_active: false,
                is_closed: true,
              })
              .eq("id", data.id);

            console.log("🧪 DROP CLOSE:", closeData);
            console.log("❌ DROP CLOSE ERROR:", closeError);

            console.log("🎉 DROP CLOSED");

            // 🔁 CREATE NEW DROP
            const newTrigger = Math.floor(Math.random() * (120 - 80 + 1)) + 80;

            console.log("🎯 New trigger generated:", newTrigger);

            const { data: insertData, error: insertError } = await supabase
              .from("drops")
              .insert([
                {
                  total_entries: 0,
                  trigger_number: newTrigger,
                  is_active: true,
                  is_closed: false,
                },
              ]);

            console.log("🧪 NEW DROP INSERT:", insertData);
            console.log("❌ NEW DROP INSERT ERROR:", insertError);

            console.log("🔁 NEW DROP CREATED");

            return;
          }

          // 📈 NORMAL UPDATE
          const { data: updateData, error: updateError } = await supabase
            .from("drops")
            .update({ total_entries: newTotal })
            .eq("id", data.id);

          console.log("🧪 DROP UPDATE:", updateData);
          console.log("❌ DROP UPDATE ERROR:", updateError);
        }
      } catch (err) {
        console.log("❌ Async error:", err);
      }
    }, 0);

    return {
      statusCode: 200,
      body: "ok",
    };
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};
