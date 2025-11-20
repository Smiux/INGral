import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Eye, Edit3, ChevronLeft, Grid, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserProfile, fetchUserArticles, fetchUserContributions } from '@/utils/user';
import { UserProfile, Article } from '@/types';
import { ProfileEditor } from '@/components/ProfileEditor';

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userArticles, setUserArticles] = useState<Article[]>([]);
  const [contributions, setContributions] = useState<Article[]>([]);
  const [userGraphs, setUserGraphs] = useState<{id: string, name: string, nodes: number, edges: number, created_at: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'created' | 'contributed' | 'graphs'>('created');
  const [isEditorOpen, setIsEditorOpen] = useState(false);


  const loadProfileData = useCallback(async () => {
    setIsLoading(true);
    try {
      const profileData = await fetchUserProfile(userId!);
      const articlesData = await fetchUserArticles(userId!);
      const contributionsData = await fetchUserContributions(userId!);

      setProfile(profileData);
      setUserArticles(articlesData);
      setContributions(contributionsData);
      
      // 模拟获取用户知识图表数据（实际项目中应该调用API）
      setUserGraphs([
        { id: '1', name: '个人知识库', nodes: 45, edges: 67, created_at: '2023-11-10' },
        { id: '2', name: '项目规划图', nodes: 23, edges: 34, created_at: '2023-11-15' },
        { id: '3', name: '学习路线图', nodes: 67, edges: 98, created_at: '2023-12-01' },
      ]);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      // 如果没有提供userId，重定向到当前用户的档案（如果已登录）
      if (user) {
        navigate(`/profile/${user.id}`);
      } else {
        navigate('/auth');
      }
      return;
    }

    loadProfileData();
  }, [userId, user, navigate, loadProfileData]);

  const isOwnProfile = user?.id === userId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">Profile not found</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayedArticles = activeTab === 'created' ? userArticles : contributions;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-3xl font-bold">
                    {profile.username?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-6">
                <h1 className="text-3xl font-bold">
                  {profile.username || 'Anonymous User'}
                </h1>
                <p className="mt-1 text-indigo-100">
                  {profile.email}
                </p>
                <p className="mt-2 text-sm">
                  Joined {new Date(profile.join_date).toLocaleDateString()}
                </p>
                {isOwnProfile && (
                  <button 
                    onClick={() => setIsEditorOpen(true)}
                    className="mt-4 flex items-center text-sm bg-white text-indigo-600 px-3 py-1.5 rounded-md hover:bg-white/90 transition"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
            
            {/* Contribution Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex justify-center">
                  <BookOpen className="w-6 h-6 text-yellow-300" />
                </div>
                <div className="mt-1 text-2xl font-bold">{profile.articles_created}</div>
                <div className="text-xs text-white/70">Articles</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex justify-center">
                  <Users className="w-6 h-6 text-yellow-300" />
                </div>
                <div className="mt-1 text-2xl font-bold">{profile.articles_contributed}</div>
                <div className="text-xs text-white/70">Contributions</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex justify-center">
                  <Grid className="w-6 h-6 text-yellow-300" />
                </div>
                <div className="mt-1 text-2xl font-bold">{userGraphs.length}</div>
                <div className="text-xs text-white/70">Graphs</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex justify-center">
                  <Eye className="w-6 h-6 text-yellow-300" />
                </div>
                <div className="mt-1 text-2xl font-bold">{profile.total_views.toLocaleString()}</div>
                <div className="text-xs text-white/70">Views</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Details Section */}
        {(profile?.bio || isOwnProfile) && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                About
              </h2>
              {isOwnProfile && (
                <button 
                  onClick={() => setIsEditorOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Edit
                </button>
              )}
            </div>
            {profile?.bio ? (
              <p className="text-gray-600">{profile.bio}</p>
            ) : (
              <p className="text-gray-500 italic">
                {isOwnProfile ? 'Add a bio to tell others about yourself.' : 'No bio available.'}
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('created')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'created' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              My Articles ({userArticles.length})
            </button>
            <button
              onClick={() => setActiveTab('contributed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'contributed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              My Contributions ({contributions.length})
            </button>
            <button
              onClick={() => setActiveTab('graphs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'graphs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              My Knowledge Graphs ({userGraphs.length})
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        <div className="space-y-6">
          {activeTab === 'created' || activeTab === 'contributed' ? (
            // Articles List
            displayedArticles.length > 0 ? (
              displayedArticles.map((article) => (
                <div key={article.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <Link
                      to={`/article/${article.slug}`}
                      className="block group"
                    >
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                        {article.title}
                      </h3>
                      <p className="mt-2 text-gray-600 line-clamp-2">
                        {article.content.replace(/[#*`]/g, '').substring(0, 150)}...
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-between text-sm text-gray-500 gap-4">
                        <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            {article.view_count || 0} views
                          </span>
                          {article.visibility === 'public' && (
                            <span className="text-green-600">Public</span>
                          )}
                          {article.visibility === 'community' && (
                            <span className="text-blue-600">Community</span>
                          )}
                          {article.visibility === 'private' && (
                            <span className="text-gray-600">Private</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No {activeTab === 'created' ? 'articles' : 'contributions'} yet</h3>
                <p className="mt-2 text-gray-600">
                  {activeTab === 'created' 
                    ? 'Start creating new knowledge articles to share with the community.'
                    : 'Contribute to existing articles to help improve the knowledge base.'
                  }
                </p>
                <Link
                  to="/create"
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create New Article
                </Link>
              </div>
            )
          ) : (
            // Knowledge Graphs List
            userGraphs.length > 0 ? (
              userGraphs.map((graph) => (
                <div key={graph.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{graph.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          <span className="flex items-center text-gray-600">
                            <Grid className="w-4 h-4 mr-1" />
                            {graph.nodes} nodes
                          </span>
                          <span className="flex items-center text-gray-600">
                            <div className="w-4 h-4 mr-1 border-l-2 border-b-2 border-gray-600 transform rotate-45" />
                            {graph.edges} edges
                          </span>
                          <span className="text-gray-500">
                            Created {new Date(graph.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition">
                          View
                        </button>
                        {isOwnProfile && (
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition">
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Grid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No knowledge graphs yet</h3>
                <p className="mt-2 text-gray-600">
                  {isOwnProfile
                    ? 'Create knowledge graphs to visualize connections between your articles.'
                    : 'This user hasn\'t created any knowledge graphs yet.'
                  }
                </p>
                {isOwnProfile && (
                  <button className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Create Knowledge Graph
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Profile Editor Modal */}
      {ProfileEditor && (
        <ProfileEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          profile={profile}
          onProfileUpdate={loadProfileData}
        />
      )}
    </div>
  );
}