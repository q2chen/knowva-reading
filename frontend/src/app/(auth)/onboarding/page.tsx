"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { submitOnboarding, getOnboardingStatus } from "@/lib/api";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { StepNickname } from "@/components/onboarding/StepNickname";
import { StepLifeStage, LIFE_STAGE_OPTIONS } from "@/components/onboarding/StepLifeStage";
import { StepChallenges, CHALLENGE_OPTIONS } from "@/components/onboarding/StepChallenges";
import { StepValues, VALUE_OPTIONS } from "@/components/onboarding/StepValues";
import { StepReadingMotivation, MOTIVATION_OPTIONS } from "@/components/onboarding/StepReadingMotivation";
import { StepInterests, INTEREST_OPTIONS } from "@/components/onboarding/StepInterests";

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // フォームデータ
  const [nickname, setNickname] = useState("");
  const [lifeStage, setLifeStage] = useState("");
  const [challenges, setChallenges] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [readingMotivations, setReadingMotivations] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // オンボーディング完了済みかチェック
  useEffect(() => {
    async function checkStatus() {
      if (!user) return;
      try {
        const status = await getOnboardingStatus();
        if (status.completed) {
          router.replace("/home");
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
      } finally {
        setCheckingStatus(false);
      }
    }
    if (user) {
      checkStatus();
    }
  }, [user, router]);

  const canProceed = () => {
    // すべてのステップでスキップ可能
    return true;
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // 最後のステップ: 送信
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 選択値からラベルを取得
      const challengeLabels = challenges.map((c) => {
        const option = CHALLENGE_OPTIONS.find((o) => o.value === c);
        return option ? option.label : c;
      });

      const valueLabels = values.map((v) => {
        const option = VALUE_OPTIONS.find((o) => o.value === v);
        return option ? option.label : v;
      });

      const motivationLabels = readingMotivations.map((m) => {
        const option = MOTIVATION_OPTIONS.find((o) => o.value === m);
        return option ? option.label : m;
      });

      const interestLabels = interests.map((i) => {
        const option = INTEREST_OPTIONS.find((o) => o.value === i);
        return option ? option.label : i;
      });

      // ライフステージを値からラベルに変換
      const lifeStageLabel = lifeStage
        ? LIFE_STAGE_OPTIONS.find((o) => o.value === lifeStage)?.label || lifeStage
        : undefined;

      await submitOnboarding({
        nickname: nickname || undefined,
        life_stage: lifeStageLabel,
        challenges: challengeLabels,
        values: valueLabels,
        reading_motivations: motivationLabels,
        interests: interestLabels,
        book_wishes: [],
      });

      router.push("/home");
    } catch (error) {
      console.error("Failed to submit onboarding:", error);
      alert("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipAll = async () => {
    setLoading(true);
    try {
      await submitOnboarding({
        challenges: [],
        values: [],
        reading_motivations: [],
        interests: [],
        book_wishes: [],
      });
      router.push("/home");
    } catch (error) {
      console.error("Failed to skip onboarding:", error);
      alert("スキップに失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepNickname value={nickname} onChange={setNickname} />;
      case 1:
        return <StepLifeStage value={lifeStage} onChange={setLifeStage} />;
      case 2:
        return <StepChallenges value={challenges} onChange={setChallenges} />;
      case 3:
        return <StepValues value={values} onChange={setValues} />;
      case 4:
        return (
          <StepReadingMotivation
            value={readingMotivations}
            onChange={setReadingMotivations}
          />
        );
      case 5:
        return <StepInterests value={interests} onChange={setInterests} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">
              Knowva へようこそ
            </h1>
            <button
              type="button"
              onClick={handleSkipAll}
              disabled={loading}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              すべてスキップ
            </button>
          </div>
          <OnboardingProgress
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
          />
        </div>

        <div className="min-h-[300px]">{renderStep()}</div>

        <div className="flex gap-3 mt-6">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              戻る
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              canProceed() && !loading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading
              ? "送信中..."
              : currentStep === TOTAL_STEPS - 1
                ? "始める"
                : "次へ"}
          </button>
        </div>
      </div>
    </div>
  );
}
