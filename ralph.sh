#!/bin/bash

# Ralph for Reels Analyzer
# 릴스 분석 도구 자동 개발

set -e

MAX_ITERATIONS=${1:-15}
CURRENT_DIR=$(dirname "$0")
PRD_FILE="$CURRENT_DIR/prd.json"
PROGRESS_FILE="$CURRENT_DIR/progress.txt"
PROMPT_FILE="$CURRENT_DIR/prompt.md"

echo "🎬 Ralph Reels - 릴스 분석 도구 개발 시작"
echo "==========================================="
echo "최대 반복: $MAX_ITERATIONS 회"
echo ""

# 진행 상황 표시
show_progress() {
    local complete=$(jq '[.features[] | select(.passes == true)] | length' "$PRD_FILE")
    local total=$(jq '.features | length' "$PRD_FILE")
    local percent=$((complete * 100 / total))
    
    echo "📊 진행률: $complete / $total ($percent%)"
    echo ""
    
    # 완료된 태스크
    echo "✅ 완료:"
    jq -r '.features[] | select(.passes == true) | "   - \(.title)"' "$PRD_FILE"
    echo ""
    
    # 남은 태스크
    echo "📋 남은 작업:"
    jq -r '.features[] | select(.passes == false) | "   - [\(.priority)] \(.title)"' "$PRD_FILE"
    echo ""
}

show_progress

for i in $(seq 1 $MAX_ITERATIONS); do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Iteration $i / $MAX_ITERATIONS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 완료 체크
    INCOMPLETE=$(jq '[.features[] | select(.passes == false)] | length' "$PRD_FILE")
    
    if [ "$INCOMPLETE" -eq 0 ]; then
        echo ""
        echo "🎉 PROMISE COMPLETE! 모든 태스크 완료!"
        echo ""
        show_progress
        exit 0
    fi
    
    # 다음 태스크 표시
    echo "🎯 다음 태스크:"
    jq -r '.features[] | select(.passes == false) | "   \(.title): \(.description)"' "$PRD_FILE" | head -2
    echo ""
    
    # Claude Code 호출
    claude --print "$(cat $PROMPT_FILE)" \
        --allowedTools "Read,Write,Bash(git:*),Bash(npm:*),Bash(npx:*),Bash(yt-dlp:*),Bash(ffmpeg:*)" \
        2>&1 | tee -a "$PROGRESS_FILE"
    
    # 커밋
    git add -A
    git commit -m "feat(reels): iteration $i - $(date +%Y%m%d_%H%M%S)" || true
    
    echo ""
    show_progress
    
    echo "⏳ 다음 iteration까지 10초 대기..."
    sleep 10
done

echo ""
echo "⚠️ 최대 반복 횟수 도달"
show_progress
