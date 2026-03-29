export async function onRequestGet(context) {
  const data = await context.env.RATING.get('rating', 'json');
  const rating = data || { total: 1106.4, count: 237 };
  const avg = rating.count > 0 ? (rating.total / rating.count).toFixed(1) : '0';

  return new Response(JSON.stringify({ avg, count: rating.count }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestPost(context) {
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const voted = await context.env.RATING.get(`vote:${ip}`);

  if (voted) {
    return new Response(JSON.stringify({ error: 'already_voted' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const body = await context.request.json();
  const vote = parseInt(body.vote);

  if (!vote || vote < 1 || vote > 5) {
    return new Response(JSON.stringify({ error: 'invalid_vote' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const data = await context.env.RATING.get('rating', 'json') || { total: 1106.4, count: 237 };
  data.total += vote;
  data.count += 1;

  await context.env.RATING.put('rating', JSON.stringify(data));
  await context.env.RATING.put(`vote:${ip}`, '1', { expirationTtl: 86400 * 365 });

  const avg = (data.total / data.count).toFixed(1);

  return new Response(JSON.stringify({ avg, count: data.count }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
