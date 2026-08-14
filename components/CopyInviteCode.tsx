'use client';

import { useState } from 'react';

export default function CopyInviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs font-medium text-amber-700 hover:text-amber-800"
    >
      {copied ? '복사됨' : '복사'}
    </button>
  );
}
