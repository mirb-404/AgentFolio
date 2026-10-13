import React from 'react';

export interface SkillCategory {
    title: string;
    icon: string;
    skills: string[];
}

interface SkillsDisplayProps {
    skills: SkillCategory[];
}

const SkillsDisplay: React.FC<SkillsDisplayProps> = React.memo(({ skills }) => (
    <div className="flex flex-col gap-5 w-full">
        {skills.map((category) => (
            <div key={category.title}>
                <h4 className="text-sm font-medium text-subtle mb-2.5">{category.title}</h4>
                <div className="flex flex-wrap gap-1.5">
                    {category.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-raised px-3 py-1 text-sm text-fg">
                            {skill}
                        </span>
                    ))}
                </div>
            </div>
        ))}
    </div>
));

export default SkillsDisplay;
