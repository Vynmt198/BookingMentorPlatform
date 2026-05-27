import React from "react";
import { useNavigate } from "react-router";
import { CvAnalysisHubHero } from "../../components/cv/CvAnalysisHubSections";
import { requireLoginNavigate } from "../../utils/authGate";

export function CVAnalysisHub() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CvAnalysisHubHero
        onJd={() => requireLoginNavigate(navigate, "/cv-analysis/jd")}
        onField={() => requireLoginNavigate(navigate, "/cv-analysis/field")}
      />
    </div>
  );
}
