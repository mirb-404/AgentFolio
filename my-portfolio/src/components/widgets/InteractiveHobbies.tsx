import React from 'react';
import { Camera, Mountain, BookOpen, Gamepad2, Brain, Github, Star, Coffee, Printer, Music, Telescope, Code2, Cpu, Globe, Rocket, MonitorPlay, Joystick, PenTool, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import FadeImg from '../ui/FadeImg';
import type { Hobby } from '../../data/portfolioData';

interface InteractiveHobbiesProps {
    hobbies: Hobby[];
}

const ICONS: Record<string, LucideIcon> = {
    camera: Camera, mountain: Mountain, book: BookOpen, gamepad: Gamepad2, brain: Brain,
    github: Github, coffee: Coffee, printer: Printer, music: Music, telescope: Telescope,
    code: Code2, cpu: Cpu, globe: Globe, rocket: Rocket, monitor: MonitorPlay,
    joystick: Joystick, pen: PenTool, bulb: Lightbulb,
};

const InteractiveHobbies: React.FC<InteractiveHobbiesProps> = React.memo(({ hobbies }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {hobbies.map((hobby, idx) => {
            const Icon = ICONS[hobby.icon?.toLowerCase() ?? ''] ?? Star;
            const wide = idx === 0;
            return (
                <div
                    key={hobby.title}
                    className={`rounded-2xl border border-line overflow-hidden flex flex-col ${wide ? 'sm:col-span-2' : ''}`}
                >
                    {hobby.bgImage && (
                        <div className={`w-full bg-raised overflow-hidden ${wide ? 'aspect-[2.6/1]' : 'aspect-[16/9]'}`}>
                            <FadeImg src={hobby.bgImage} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon size={16} className="text-subtle" />
                            <h4 className="text-[15px] font-medium text-fg">{hobby.title}</h4>
                        </div>
                        {hobby.description && <p className="text-sm text-muted leading-relaxed">{hobby.description}</p>}
                    </div>
                </div>
            );
        })}
    </div>
));

export default InteractiveHobbies;
