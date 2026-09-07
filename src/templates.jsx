

export const TEMPLATE_CATEGORIES = [
  {
    id: 'design',
    name: 'Design & Branding',
    icon: 'Layout',
    templates: [
      {
        id: 'brand-guidelines',
        name: 'Brand Guidelines',
        description: 'Wireframe and define your brand colors, fonts, and assets dynamically.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'brand-guidelines',
          x: center.x - 600,
          y: center.y - 700,
          props: { w: 1200, h: 1400 }
        }]
      },
      {
        id: 'product-design',
        name: 'Product Design Planner',
        description: 'Kanban-style grid to plan product design, development, marketing and sales over quarters.',
        icon: 'Layout',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'product-design',
          x: center.x - 900,
          y: center.y - 600,
          props: { w: 1800, h: 1200 }
        }]
      }
    ]
  },
  {
    id: 'personal',
    name: 'Personal & Productivity',
    icon: 'Grid',
    templates: [
      {
        id: 'vision-board',
        name: 'Vision Board',
        description: 'Map out your goals across health, wealth, and personal development.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'vision-board',
          x: center.x - 700,
          y: center.y - 500,
          props: { w: 1400, h: 1000 }
        }]
      },
      {
        id: 'weekly-planner',
        name: 'Weekly Planner',
        description: 'Track chores, meals, and habits throughout the week.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'weekly-planner',
          x: center.x - 700,
          y: center.y - 500,
          props: { w: 1400, h: 1000 }
        }]
      }
    ]
  },
  {
    id: 'strategy',
    name: 'Strategy & Problem Solving',
    icon: 'Lightbulb',
    templates: [
      {
        id: 'business-model-canvas',
        name: 'Business Model Canvas',
        description: 'Interactive 9-box grid to map out your business strategy.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'business-model-canvas',
          x: center.x - 700,
          y: center.y - 500,
          props: { w: 1400, h: 1000 }
        }]
      },
      {
        id: 'timeline',
        name: 'Project Timeline',
        description: 'Dynamic timeline that stretches as you add milestones.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'timeline',
          x: center.x - 700,
          y: center.y - 400,
          props: { w: 1400, h: 800 }
        }]
      },
      {
        id: 'eisenhower-matrix',
        name: 'Eisenhower Matrix',
        description: 'Prioritize tasks by urgency and importance with smart auto-spawning notes.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'eisenhower-matrix',
          x: center.x - 700,
          y: center.y - 500,
          props: { w: 1400, h: 1000 }
        }]
      },
      {
        id: 'empathy-map',
        name: 'Ideation Empathy Map',
        description: "A structured workshop layout to step into your user's shoes.",
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'empathy-map',
          x: center.x - 700,
          y: center.y - 500,
          props: { w: 1400, h: 1000 }
        }]
      },
      {
        id: 'brain-dump',
        name: 'Brain Dump Area',
        description: 'A massive chaotic zone for sticky notes, files, and wild ideas.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'brain-dump',
          x: center.x - 800,
          y: center.y - 600,
          props: { w: 1600, h: 1200 }
        }]
      },
      {
        id: 'user-storymap',
        name: 'User Storymap',
        description: 'Map out user personas, activities, tasks, and stories across releases.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'user-storymap',
          x: center.x - 800,
          y: center.y - 600,
          props: { w: 1600, h: 1200 }
        }]
      },
      {
        id: 'customer-journey',
        name: 'Customer Journey Map',
        description: 'Map touchpoints, pain points, and gain points across customer stages.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'customer-journey',
          x: center.x - 800,
          y: center.y - 400,
          props: { w: 1600, h: 800 }
        }]
      },
      {
        id: 'retrospective',
        name: 'Retrospective',
        description: '2x2 grid for team retrospectives (Continue, Stop, Invent, Act).',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'retrospective',
          x: center.x - 800,
          y: center.y - 800,
          props: { w: 1600, h: 1600 }
        }]
      }
    ]
  },
  {
    id: 'brainstorming',
    name: 'Brainstorming',
    icon: 'MessageSquare',
    templates: [
      {
        id: 'mind-map-root',
        name: 'Mind Map Generator',
        description: 'A smart root node that automatically connects new ideas as you brainstorm.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'mind-map-node',
          x: center.x - 100,
          y: center.y - 50,
          props: { w: 200, h: 100, text: 'Central Idea', color: '#F97316', nodeShape: 'rounded' }
        }]
      }
    ]
  },
  {
    id: 'tools',
    name: 'Tools & Utilities',
    icon: 'Wrench',
    templates: [
      {
        id: 'calculator',
        name: 'Neo-brutalist Calculator',
        description: 'Interactive calculator with basic and scientific modes.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'calculator',
          x: center.x - 160,
          y: center.y - 230,
          props: { w: 320, h: 460, isScientific: false, expression: '', history: [] }
        }]
      },
      {
        id: 'line',
        name: 'Connecting Line / Arrow',
        description: 'Standard connecting line or arrow.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'arrow',
          x: center.x - 50,
          y: center.y - 50,
          props: {} // Default arrow properties
        }]
      },
      {
        id: 'quiz-mcq',
        name: 'MCQ Quiz Widget',
        description: 'Interactive multiple choice question block.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'quiz-mcq',
          x: center.x - 200,
          y: center.y - 150,
          props: { w: 400, h: 300 }
        }]
      },
      {
        id: 'quiz-written',
        name: 'Written Response Quiz',
        description: 'Interactive text response block.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'quiz-written',
          x: center.x - 200,
          y: center.y - 150,
          props: { w: 400, h: 300 }
        }]
      },
      {
        id: 'chart-bar',
        name: 'Bar Chart',
        description: 'Interactive data bar chart.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'milanote-chart',
          x: center.x - 300,
          y: center.y - 200,
          props: { w: 600, h: 400, chartType: 'bar' }
        }]
      },
      {
        id: 'chart-line',
        name: 'Line Chart',
        description: 'Interactive data line chart.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'milanote-chart',
          x: center.x - 300,
          y: center.y - 200,
          props: { w: 600, h: 400, chartType: 'line' }
        }]
      },
      {
        id: 'chart-pie',
        name: 'Pie Chart',
        description: 'Interactive data pie chart.',
        createShapes: (center) => [{
          id: Math.random().toString(36).slice(2, 10),
          type: 'milanote-chart',
          x: center.x - 300,
          y: center.y - 200,
          props: { w: 600, h: 400, chartType: 'pie' }
        }]
      }
    ]
  }
];
