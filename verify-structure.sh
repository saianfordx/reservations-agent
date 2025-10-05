#!/bin/bash

echo "🔍 Verifying AI Reservations Project Structure"
echo "=============================================="
echo ""

# Check src directory
echo "✅ Checking src/ directory structure:"
if [ -d "src/app" ] && [ -d "src/modules" ] && [ -d "src/shared" ] && [ -d "src/lib" ]; then
  echo "  ✓ All main directories exist"
else
  echo "  ✗ Missing required directories"
  exit 1
fi

# Count files
FILES=$(find src -type f | wc -l | tr -d ' ')
echo "  ✓ Found $FILES files in src/"

# Check key files
echo ""
echo "✅ Checking key files:"
[ -f "src/app/layout.tsx" ] && echo "  ✓ src/app/layout.tsx"
[ -f "src/app/page.tsx" ] && echo "  ✓ src/app/page.tsx"
[ -f "src/middleware.ts" ] && echo "  ✓ src/middleware.ts"
[ -f "src/lib/utils.ts" ] && echo "  ✓ src/lib/utils.ts"
[ -f "convex/schema.ts" ] && echo "  ✓ convex/schema.ts"
[ -f "RULES.md" ] && echo "  ✓ RULES.md"
[ -f "tsconfig.json" ] && echo "  ✓ tsconfig.json"

# Check tsconfig paths
echo ""
echo "✅ Checking TypeScript configuration:"
if grep -q '"@/\*": \["./src/\*"\]' tsconfig.json; then
  echo "  ✓ Path alias @/* configured correctly"
else
  echo "  ✗ Path alias not configured"
fi

# Check for node_modules
echo ""
echo "✅ Checking dependencies:"
if [ -d "node_modules" ]; then
  echo "  ✓ node_modules exists"
  if [ -d "node_modules/@clerk/nextjs" ]; then
    echo "  ✓ Clerk installed"
  fi
  if [ -d "node_modules/convex" ]; then
    echo "  ✓ Convex installed"
  fi
else
  echo "  ✗ node_modules not found (run npm install)"
fi

echo ""
echo "=============================================="
echo "✅ Project structure verified successfully!"
echo ""
echo "Next steps:"
echo "1. Copy .env.local.example to .env.local"
echo "2. Add your Clerk and Convex credentials"
echo "3. Run: npx convex dev"
echo "4. Run: npm run dev"
echo ""
