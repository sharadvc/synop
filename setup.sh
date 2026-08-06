#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║         Synop — AI Video Summarizer      ║"
echo "  ║     Free · Open Source · Privacy First   ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo -e "${CYAN}▸ Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${YELLOW}⚠ Node.js 20+ recommended (you have $(node --version))${NC}"
fi

if ! command -v git &> /dev/null; then
  echo -e "${RED}✗ git not found. Install from https://git-scm.com${NC}"
  exit 1
fi
echo -e "${GREEN}✓ git $(git --version | awk '{print $3}')${NC}"

# Clone if not already in repo
if [ ! -f "package.json" ]; then
  echo ""
  echo -e "${CYAN}▸ Cloning repository...${NC}"
  git clone <repo-url>
  cd synop
  echo -e "${GREEN}✓ Repository cloned${NC}"
else
  echo -e "${GREEN}✓ Already in synop directory${NC}"
fi

# Install
echo ""
echo -e "${CYAN}▸ Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Environment
if [ ! -f ".env" ]; then
  echo ""
  echo -e "${CYAN}▸ Setting up environment...${NC}"
  cp .env.example .env 2>/dev/null || touch .env
  echo -e "${YELLOW}⚠ Created .env file — add your API keys${NC}"
  echo -e "${YELLOW}  Get a free OpenRouter key: https://openrouter.ai/keys${NC}"
  echo -e "${YELLOW}  Then add it to .env: OPENROUTER_API_KEY=sk-or-xxx${NC}"
else
  echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Database
echo ""
echo -e "${CYAN}▸ Initializing database...${NC}"
npx prisma db push
echo -e "${GREEN}✓ Database ready${NC}"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  ${GREEN}Synop is ready!${NC}                          ║"
echo "  ║                                          ║"
echo "  ║  Run:  ${CYAN}npm run dev${NC}                         ║"
echo "  ║  Open: ${CYAN}http://localhost:3000${NC}               ║"
echo "  ║                                          ║"
echo "  ║  Paste any YouTube URL and get your       ║"
echo "  ║  first AI summary in seconds.             ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
