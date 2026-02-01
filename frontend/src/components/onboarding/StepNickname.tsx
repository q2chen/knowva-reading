"use client";

interface StepNicknameProps {
  value: string;
  onChange: (value: string) => void;
}

export function StepNickname({ value, onChange }: StepNicknameProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ニックネームを教えてください
        </h2>
        <p className="text-sm text-gray-600">
          Knowvaでの表示名になります。後から変更できます。
        </p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: たろう"
        maxLength={30}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
      />
      <p className="text-xs text-gray-400 text-right">{value.length}/30文字</p>
    </div>
  );
}
