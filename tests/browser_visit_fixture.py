"""Local response for the existing anonymous visitor-count request in browser tests."""
VISIT_URL='https://rehaan-website-updates.daraashiq9055.workers.dev/visit'

def mock_visit_counter(context):
    # Register after the catch-all route so the known analytics request cannot
    # reach production or be mistaken for a student/application/payment write.
    context.route(VISIT_URL,lambda route:route.fulfill(
        status=200,content_type='application/json',body='{"ok":true}',
        headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}))
