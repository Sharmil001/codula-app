// import { PRAnalyzer } from '@/components/pr-analyzer/pr-analyzer';

// export default function PRAnalyzerPage() {
//   return (
//     <div className="min-h-screen bg-background">
//       <div className="container mx-auto max-w-4xl px-4 py-8">
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold mb-2">Pull Request Analyzer</h1>
//           <p className="text-muted-foreground">
//             Analyze any GitHub Pull Request and get AI-powered insights about what was accomplished.
//           </p>
//         </div>
        
//         <PRAnalyzer />
//       </div>
//     </div>
//   );
// }

import { PRAnalyzer } from '@/components/pr-analyzer/pr-analyzer';

export default function PRAnalyzerPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pull Request Analyzer</h1>
          <p className="text-muted-foreground">
            Analyze any GitHub Pull Request and get AI-powered insights about what was accomplished.
          </p>
        </div>
        
        <PRAnalyzer />
      </div>
    </div>
  );
}