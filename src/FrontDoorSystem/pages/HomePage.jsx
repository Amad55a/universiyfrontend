// src/pages/LandingPage.jsx
// Theme fixes applied:
//  • Hero:        bg-black → bg-white dark:bg-black  |  text-white → text-black dark:text-white
//  • HowItWorks:  bg-black → bg-gray-50 dark:bg-black  |  same text fix
//  • Dot pattern in Hero: only visible in dark mode (hidden by default)
//  • Outline CTA button: border/text adapt to both modes
//  • Stats cards: border + text adapt to both modes
//  • Scroll indicator: adapts to both modes


import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import Hero from "../components/LandingHero";
import Features from "../components/FeatureCards";
import HowItWorks from "../components/LandingHowItWorks";
import Faq from "../components/LandingFaq";
import { Helmet } from "react-helmet-async";

// ═══════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════
const LandingPage = () => {
  const { t } = useLanguage() || {};
  return (
    <>
    <Helmet>
      <title>UniCORE | University Management &amp; Online Exam Platform</title>
      <meta
        name="description"
        content="UniCORE connects students, teachers, and administrators in one platform: secure online exams, digital library, learning resources, and an AI study assistant."
      />
      <link rel="canonical" href="https://www.unicores.tech/" />
      <meta name="robots" content="index, follow" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.unicores.tech/" />
      <meta property="og:title" content="UniCORE | University Management &amp; Online Exam Platform" />
      <meta
        property="og:description"
        content="UniCORE connects students, teachers, and administrators in one platform: secure online exams, digital library, learning resources, and an AI study assistant."
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="UniCORE | University Management &amp; Online Exam Platform" />
      <meta
        name="twitter:description"
        content="UniCORE connects students, teachers, and administrators in one platform: secure online exams, digital library, learning resources, and an AI study assistant."
      />
    </Helmet>
      <Hero       t={t} />
      <Features   t={t} />
      <HowItWorks t={t} />
      <Faq        t={t} />
    </>
  );
};

export default LandingPage;