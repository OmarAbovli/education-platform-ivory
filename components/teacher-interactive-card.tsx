"use client"

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, GraduationCap, Award, Star } from 'lucide-react';

export default function TeacherInteractiveCard() {
  const [isHovered, setIsHovered] = useState(false);

  const benefits = [
    { text: "Save time, boost focus.", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
    { text: "Your success is our mission.", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
    { text: "English, simplified.", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
  ];

  return (
    <div className="relative max-w-7xl mx-auto px-4 py-12">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-left space-y-8"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Expert Guidance</span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Meet Your Expert Teacher
            </h2>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              <span className="font-bold text-primary dark:text-primary-foreground italic">Your Name</span>,
              with over <span className="text-slate-900 dark:text-white font-semibold underline decoration-primary/40 decoration-4 underline-offset-4">30 years of experience</span>,
              makes learning English an enjoyable and seamless journey.
            </p>
          </div>

          <div className="grid gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="shrink-0 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 group-hover:scale-110 transition-transform">
                  {benefit.icon}
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {benefit.text}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-400">
              <Star className="w-5 h-5 fill-current" />
              <span className="font-bold text-lg">4.9/5</span>
              <span className="text-sm opacity-80">(Reviews)</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400">
              <Award className="w-5 h-5" />
              <span className="font-bold text-lg">Certified</span>
              <span className="text-sm opacity-80">Professional</span>
            </div>
          </div>
        </motion.div>

        {/* Interactive Image Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="relative group"
        >
          {/* Glowing rings */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-emerald-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute -inset-1 bg-gradient-to-tr from-primary/50 to-emerald-500/50 rounded-[2.2rem] blur opacity-0 group-hover:opacity-30 transition-opacity duration-700" />

          <div
            className="relative bg-slate-100 dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl aspect-[4/5] md:aspect-[3/4] cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsHovered(!isHovered)}
          >
            <AnimatePresence mode="wait">
              {!isHovered ? (
                <motion.div
                  key="avatar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full"
                >
                  <img
                    src="/teatcher.jpg"
                    alt="Teacher Avatar"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
                    <div className="text-white">
                      <p className="text-sm font-medium opacity-80">Expert Teacher</p>
                      <h3 className="text-2xl font-bold">Your Name</h3>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="portrait"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full"
                >
                  <img
                    src="/teatcher.jpg"
                    alt="Teacher Portrait"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating badge */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-20 hidden md:block"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="text-xl font-bold">25+</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Years of</p>
                <p className="text-sm font-bold">Experience</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
