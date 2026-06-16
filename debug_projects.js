import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    // let's try the query that was used
    // .or(`user_id.eq.SOME_ID,members.cs.[{"user_id":"SOME_ID"}]`)
  
  if (error) {
    console.error('Error fetching all projects:', error);
  } else {
    console.log('Total projects:', data?.length);
    console.log('First project:', data?.[0]);
  }
}

main();
