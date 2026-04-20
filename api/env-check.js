export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    MORRIS_URL: process.env.NEXT_PUBLIC_MORRIS_URL || 'NOT SET',
    HAS_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'YES' : 'NO',
    APP_SOURCE: process.env.NEXT_PUBLIC_APP_SOURCE || 'NOT SET',
    HAS_FAL_KEY: process.env.FAL_KEY ? 'YES' : 'NO',
  });
}