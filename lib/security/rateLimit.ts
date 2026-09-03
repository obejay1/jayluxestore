const buckets = new Map<string,{count:number;reset:number}>();
export function checkRateLimit(key:string,limit=30,windowMs=60000){const now=Date.now();const b=buckets.get(key);if(!b||now>b.reset){buckets.set(key,{count:1,reset:now+windowMs});return true}b.count++;return b.count<=limit}
