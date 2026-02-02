"use client";

import type { ReviewData } from "./TaskCardActions";

interface TaskCardReviewProps {
  reviewData: ReviewData;
  branch?: string;
  onClose: () => void;
}

export default function TaskCardReview({ reviewData, branch, onClose }: TaskCardReviewProps) {
  return (
    <div className="mb-2 border border-crt-cyan/30 rounded bg-crt-black/50 overflow-hidden">
      <div className="px-2 py-1.5 border-b border-crt-cyan/20 flex items-center justify-between">
        <span className="text-[9px] font-mono text-crt-cyan tracking-wider">
          {branch ? `REVIEW: ${branch}` : `REVIEW: ${reviewData.startCommit.slice(0, 7)}..${reviewData.headCommit.slice(0, 7)}`}
        </span>
        <button onClick={onClose} className="text-[9px] text-crt-gray-text hover:text-gray-200">&#x2715;</button>
      </div>
      {reviewData.log && (
        <div className="px-2 py-1.5 border-b border-crt-gray/20">
          <div className="text-[8px] font-mono text-crt-gray-text tracking-wider mb-1">COMMITS</div>
          <pre className="text-[9px] font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">{reviewData.log}</pre>
        </div>
      )}
      {reviewData.diffStat && (
        <div className="px-2 py-1.5 border-b border-crt-gray/20">
          <div className="text-[8px] font-mono text-crt-gray-text tracking-wider mb-1">CHANGES</div>
          <pre className="text-[9px] font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">{reviewData.diffStat}</pre>
        </div>
      )}
      {reviewData.untracked && (
        <div className="px-2 py-1.5 border-b border-crt-gray/20">
          <div className="text-[8px] font-mono text-crt-gray-text tracking-wider mb-1">UNTRACKED / MODIFIED</div>
          <pre className="text-[9px] font-mono text-crt-amber whitespace-pre-wrap leading-relaxed">{reviewData.untracked}</pre>
        </div>
      )}
      {reviewData.diff && (
        <div className="px-2 py-1.5">
          <div className="text-[8px] font-mono text-crt-gray-text tracking-wider mb-1">DIFF</div>
          <pre className="text-[9px] font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">{
            reviewData.diff.split("\n").map((line, i) => {
              const color = line.startsWith("+") ? "text-crt-green" : line.startsWith("-") ? "text-crt-red" : line.startsWith("@@") ? "text-crt-cyan" : "text-gray-400";
              return <span key={i} className={color}>{line}{"\n"}</span>;
            })
          }</pre>
        </div>
      )}
      {!reviewData.log && !reviewData.diffStat && !reviewData.untracked && (
        <div className="px-2 py-3 text-center text-[9px] font-mono text-crt-gray-text">No changes detected</div>
      )}
    </div>
  );
}
