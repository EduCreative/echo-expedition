/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect } from 'react';
import { closeOnboarding, startLesson, speakOnboardingStep } from '../lib/actions';
import c from 'clsx';

const steps = [
  {
    icon: 'waving_hand',
    title: 'Welcome to Echo Expedition!',
    urduTitle: 'ایکو ایکسپیڈیشن میں خوش آمدید!',
    content: 'Your personal AI guide to English fluency. Let\'s take a quick tour of the features.',
    urduContent: 'انگلش روانی کے لیے آپ کا ذاتی AI گائیڈ۔ آئیے خصوصیات کا ایک مختصر دورہ کریں۔'
  },
  {
    icon: 'map',
    title: 'Your Expedition Map',
    urduTitle: 'آپ کا ایکسپیڈیشن نقشہ',
    content: 'This is your main learning path. Complete lessons in order to unlock new levels and challenges. Your journey starts here!',
    urduContent: 'یہ آپ کا مرکزی سیکھنے کا راستہ ہے۔ نئے لیولز اور چیلنجز کو کھولنے کے لیے اسباق مکمل کریں۔ آپ کا سفر یہاں سے شروع ہوتا ہے!'
  },
  {
    icon: 'mic_external_on',
    title: 'Listen, Speak, Improve',
    urduTitle: 'سنیں، بولیں، بہتر بنائیں',
    content: 'In each lesson, you\'ll listen to a prompt, record yourself speaking, and receive instant AI feedback on your content and pronunciation.',
    urduContent: 'ہر سبق میں، آپ ایک ہدایت سنیں گے، اپنی آواز ریکارڈ کریں گے، اور اپنے مواد اور تلفظ پر فوری AI فیڈ بیک حاصل کریں گے۔'
  },
  {
    icon: 'speed',
    title: 'Practice with Fun Tools',
    urduTitle: 'دلچسپ ٹولز کے ساتھ مشق کریں',
    content: 'When you want a break from lessons, try the Pronunciation Race or Echo Drill to test your skills in a fun, game-like environment.',
    urduContent: 'جب آپ اسباق سے وقفہ چاہتے ہیں، تو اپنی مہارتوں کو ایک دلچسپ، کھیل جیسے ماحول میں آزمانے کے لیے Pronunciation Race یا Echo Drill آزمائیں۔'
  },
  {
    icon: 'flag_circle',
    title: 'Ready to Begin?',
    urduTitle: 'شروع کرنے کے لیے تیار ہیں؟',
    content: 'You\'re all set! Your first lesson is waiting for you. Good luck on your expedition!',
    urduContent: 'آپ بالکل تیار ہیں! آپ کا پہلا سبق آپ کا منتظر ہے۔ آپ کی مہم کے لیے نیک خواہشات!'
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // A short delay to allow the new content to render and not feel abrupt
    const timer = setTimeout(() => {
        const step = steps[currentStep];
        speakOnboardingStep(step);
    }, 300); // 300ms delay

    return () => {
        clearTimeout(timer);
        // Stop any speech when the component unmounts or step changes
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    };
  }, [currentStep]);


  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStart = () => {
    closeOnboarding();
    startLesson('a1', 0);
  };

  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-icon">
          <span className="icon">{step.icon}</span>
        </div>

        <div className="onboarding-content">
          <h3>{step.title}</h3>
          <p>{step.content}</p>
          <hr style={{margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-secondary)'}}/>
          <h4 className="onboarding-urdu-title">{step.urduTitle}</h4>
          <p className="onboarding-urdu-content">{step.urduContent}</p>
        </div>

        <div className="onboarding-progress">
          {steps.map((_, index) => (
            <div key={index} className={c('progress-dot', { active: index === currentStep })}></div>
          ))}
        </div>

        <div className="onboarding-actions">
          {currentStep > 0 ? (
             <button className="button" onClick={handleBack}>
                <span className="icon">arrow_back</span> Back
             </button>
          ) : ( // Placeholder to keep spacing consistent
             <div style={{width: '95px'}}></div>
          )}

          {isLastStep ? (
            <button className="button primary" onClick={handleStart}>
              Start First Lesson <span className="icon">rocket_launch</span>
            </button>
          ) : (
            <button className="button primary" onClick={handleNext}>
              Next <span className="icon">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}