# Deploying Edge Functions

## Prerequisites

You need to have the Supabase CLI installed and linked to your project.

## Option 1: Deploy via Supabase CLI (Recommended)

1. Link your project (if not already linked):
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

2. Deploy the export-training-data function:
   ```bash
   supabase functions deploy export-training-data
   ```

3. Deploy the export-prompts function (if updated):
   ```bash
   supabase functions deploy export-prompts
   ```

## Option 2: Deploy via Supabase Dashboard

If you can't use the CLI, you can deploy through the Supabase Dashboard:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to "Edge Functions" in the left sidebar
4. Click "Create a new function" or "Deploy new version"
5. Upload the function code from:
   - `supabase/functions/export-training-data/index.ts`
   - `supabase/functions/export-prompts/index.ts`

## Verify Deployment

After deployment, verify the functions are working:

1. Check the function exists in your Supabase Dashboard → Edge Functions
2. Test the endpoint:
   ```bash
   curl -i --location --request POST 'https://<your-project-ref>.supabase.co/functions/v1/export-training-data' \
     --header 'Authorization: Bearer <your-anon-key>' \
     --header 'Content-Type: application/json' \
     --data '{"dataset":"test"}'
   ```

## Troubleshooting CORS Errors

If you see CORS errors:

1. Verify the function is deployed (check Supabase Dashboard)
2. Check the browser console for the exact error message
3. Verify the CORS headers in the edge function include:
   - `Access-Control-Allow-Origin: *`
   - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
   - `Access-Control-Allow-Methods: POST, OPTIONS`
   - `Access-Control-Expose-Headers: Content-Disposition`
4. Make sure the function handles OPTIONS requests (preflight)

## CORS Headers Updated

Both edge functions now include the correct CORS headers:
- ✅ export-prompts
- ✅ export-training-data
