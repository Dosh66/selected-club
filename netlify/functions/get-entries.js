const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async () => {
  const { data } = await supabase
    .from("main_draw")
    .select("*")
    .single();

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};
