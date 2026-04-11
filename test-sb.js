require('dotenv').config({ path: '.env.local' });
const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

async function checkOrders() {
  const url = `${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?select=id,status,order_type,customer_name,created_at&order=created_at.desc&limit=5`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await response.json();
  console.log("Recent Orders:");
  console.log(JSON.stringify(data, null, 2));
}

checkOrders();
