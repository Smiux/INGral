import { Header } from '../components/Header';
import { DatabaseMonitor } from '../components/DatabaseMonitor';

export function DatabasePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of database performance and statistics</p>
        </div>
        
        <DatabaseMonitor />
      </main>
    </div>
  );
}
