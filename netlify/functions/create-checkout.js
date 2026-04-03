const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {

  const { mainQty, dropQty } = JSON.parse(event.body);

  const line_items = [];

  if(mainQty > 0){
    line_items.push({
      price: "price_1TGyxX0JuSOSCs9W2yPqByNz",
      quantity: mainQty
    });
  }

  if(dropQty > 0){
    line_items.push({
      price: "price_1TGyzo0JuSOSCs9WnEZ1WYca",
      quantity: dropQty
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items,
    success_url: "https://fancy-cactus-171e27.netlify.app",
    cancel_url: "https://fancy-cactus-171e27.netlify.app"
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url })
  };
};
