#!/bin/bash

# Ralph Once - Human-in-the-loop 버전
# 한 번 실행하고 결과 확인 후 다시 실행

set -e

CURRENT_DIR=$(dirname "$0")
PRD_FILE="$CURRENT_DIR/prd.json"
PROGRESS_FILE="$CURRENT_DIR/progress.txt"

echo "🎯 Ralph Once - 태스크 1개 처리"
echo "================================"

# 현재 상태 출력
INCOMPLETE=$(jq '[.features[] | select(.passes == false)] | length' "$PRD_FILE")
COMPLETE=$(jq '[.features[] | select(.passes == true)] | length' "$PRD_FILE")

echo "📊 현재 상태: 완료 $COMPLETE / 미완료 $INCOMPLETE"
echo ""

if [ "$INCOMPLETE" -eq 0 ]; then
    echo "✅ 모든 태스크 완료!"
    exit 0
fi

# 다음 태스크 미리보기
echo "📌 다음 처리할 태스크:"
jq -r '.features[] | select(.passes == false) | .title' "$PRD_FILE" | head -1
echo ""

read -p "진행하시겠습니까? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "취소됨"
    exit 0
fi

# Claude Code 호출
claude --print "$(cat $CURRENT_DIR/prompt.md)" \
    --allowedTools "Read,Write,Bash(git:*),Bash(npm:*),Bash(npx:*)"

# 결과 커밋
git add -A
git commit -m "Ralph: $(jq -r '.features[] | select(.passes == false) | .title' "$PRD_FILE" | head -1)" || true

echo ""
echo "✅ 완료! 결과를 확인하고 다시 실행하세요."
