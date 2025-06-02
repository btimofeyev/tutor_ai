// parent-dashboard-frontend/src/utils/subscriptionErrors.js
export const handleSubscriptionError = (error, onUpgrade) => {
    if (!error.response?.data) return false;
  
    const { code, currentPlan } = error.response.data;
  
    switch (code) {
      case 'CHILD_LIMIT_EXCEEDED':
        const upgradeMessage = currentPlan === 'free' 
          ? 'Upgrade to Family Plan to add up to 3 children'
          : 'Upgrade to Academy Plan for more children';
        
        if (confirm(`${error.response.data.error}\n\n${upgradeMessage}\n\nWould you like to upgrade now?`)) {
          onUpgrade(currentPlan === 'free' ? 'family' : 'academy');
        }
        return true;
  
      case 'AI_ACCESS_REQUIRED':
        if (confirm(`${error.response.data.error}\n\n${error.response.data.upgradeMessage}\n\nWould you like to add AI access now?`)) {
          onUpgrade('klio_addon');
        }
        return true;
  
      case 'CHILD_LOGIN_ACCESS_REQUIRED':
        if (confirm(`${error.response.data.error}\n\n${error.response.data.upgradeMessage}\n\nWould you like to upgrade now?`)) {
          onUpgrade('family');
        }
        return true;
  
      case 'MATERIAL_LIMIT_EXCEEDED':
        const materialUpgradeMsg = currentPlan === 'free'
          ? 'Add AI Pack for 100 materials or upgrade to Family Plan for 500'
          : 'Upgrade to Family Plan for 500 materials per child';
        
        if (confirm(`${error.response.data.error}\n\n${materialUpgradeMsg}\n\nWould you like to upgrade now?`)) {
          onUpgrade(currentPlan === 'free' ? 'klio_addon' : 'family');
        }
        return true;
  
      default:
        return false;
    }
  };
  
  // Helper to create upgrade function
  export const createUpgradeHandler = () => {
    const handleUpgrade = async (targetPlan) => {
      try {
        const priceIds = {
          klio_addon: 'price_1RVZczD8TZAZUMMAQWokffCi',
          family: 'price_1RVZT4D8TZAZUMMA3YIJeWWE',
          academy: 'price_1RVZTrD8TZAZUMMAiUuoU72d'
        };
  
        const response = await api.post('/stripe/create-checkout-session', {
          price_id: priceIds[targetPlan],
          success_url: `${window.location.origin}${window.location.pathname}?upgraded=true`,
          cancel_url: window.location.href
        });
        
        window.location.href = response.data.checkout_url;
      } catch (error) {
        console.error('Error creating checkout session:', error);
        alert('Failed to start upgrade process. Please try again.');
      }
    };
  
    return handleUpgrade;
  };
  
  // ================================================================
  
  // Updated Dashboard Page with enforcement
  // parent-dashboard-frontend/src/app/dashboard/page.js (key sections)
  
  import { useSubscription } from "../../hooks/useSubscription";
  import { handleSubscriptionError, createUpgradeHandler } from "../../utils/subscriptionErrors";
  
  export default function DashboardPage() {
    const subscription = useSubscription();
    const handleUpgrade = createUpgradeHandler();
  
    // ... existing state ...
  
    const handleAddChildSubmit = async (e) => {
      e.preventDefault();
      
      try {
        // Check limit before attempting
        if (!subscription.canAddChild()) {
          subscription.enforceChildLimit();
        }
  
        setLoadingInitial(true);
        const newChildData = {
          name: newChildNameState,
          grade: newChildGradeState,
        };
        
        const createdChildRes = await api.post("/children", newChildData);
        const createdChild = createdChildRes.data;
        
        // Success - refresh data
        setNewChildNameState("");
        setNewChildGradeState("");
        setShowAddChild(false);
        const childrenRes = await api.get("/children");
        const updatedChildren = childrenRes.data || [];
        setChildren(updatedChildren);
        setSelectedChild(createdChild || updatedChildren[updatedChildren.length - 1] || null);
        
      } catch (error) {
        // Handle subscription errors with upgrade prompts
        if (!handleSubscriptionError(error, handleUpgrade)) {
          alert(error.response?.data?.error || "Failed to add child.");
        }
      } finally {
        setLoadingInitial(false);
      }
    };
  
    const handleAddLessonFormSubmit = async (e) => {
      e.preventDefault();
      
      try {
        // Check material limit before upload
        const currentCount = lessonsBySubject[addLessonSubject]?.length || 0;
        if (currentCount >= subscription.permissions.maxMaterialsPerChild) {
          throw new Error(`Material limit reached: ${subscription.permissions.maxMaterialsPerChild} materials per child maximum`);
        }
  
        // Rest of your existing upload logic...
        setUploading(true);
        // ... upload logic
        
      } catch (error) {
        if (!handleSubscriptionError(error, handleUpgrade)) {
          const errorMsg = error.response?.data?.error || error.message || "Upload failed.";
          alert(`Upload Error: ${errorMsg}`);
        }
      } finally {
        setUploading(false);
      }
    };
  
    // Render with subscription-aware components
    return (
      <div className="flex h-screen bg-background-main overflow-hidden">
        {/* Sidebar with subscription info */}
        <div className="w-64 flex-shrink-0 bg-background-card border-r border-border-subtle shadow-lg">
          <StudentSidebar
            childrenList={children}
            selectedChild={selectedChild}
            onSelectChild={setSelectedChild}
            showAddChild={showAddChild}
            onToggleShowAddChild={setShowAddChild}
            newChildName={newChildNameState}
            onNewChildNameChange={(e) => setNewChildNameState(e.target.value)}
            newChildGrade={newChildGradeState}
            onNewChildGradeChange={(e) => setNewChildGradeState(e.target.value)}
            onAddChildSubmit={handleAddChildSubmit}
            onOpenChildLoginSettings={handleOpenChildLoginSettingsModal}
            canAddChild={subscription.canAddChild()}
            subscription={subscription.subscription}
          />
        </div>
  
        {/* Main content... */}
        {/* Add Material Form with enforcement */}
        <div className="w-full md:w-1/3 lg:w-2/5 xl:w-1/3 flex-shrink-0 border-l border-border-subtle bg-background-card shadow-lg overflow-y-auto p-6">
          {selectedChild && !loadingChildData ? (
            <AddMaterialForm
              // ... existing props
              currentMaterialCount={lessonsBySubject[addLessonSubject]?.length || 0}
              maxMaterials={subscription.permissions.maxMaterialsPerChild}
              canUploadMore={lessonsBySubject[addLessonSubject]?.length < subscription.permissions.maxMaterialsPerChild}
              onFormSubmit={handleAddLessonFormSubmit}
              // ... other props
            />
          ) : (
            <p className="text-sm text-text-tertiary italic text-center">
              {selectedChild && loadingChildData
                ? "Loading actions..."
                : "Select student to enable actions."}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // ================================================================
  
  // Enhanced StudentSidebar with subscription awareness
  // parent-dashboard-frontend/src/app/dashboard/components/StudentSidebar.js (updated sections)
  
  export default function StudentSidebar({
    childrenList,
    selectedChild,
    onSelectChild,
    showAddChild,
    onToggleShowAddChild,
    newChildName,
    onNewChildNameChange,
    newChildGrade,
    onNewChildGradeChange,
    onAddChildSubmit,
    onOpenChildLoginSettings,
    canAddChild = true,
    subscription = null,
  }) {
    const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  
    const hasActiveSubscription = subscription && subscription.status === 'active';
    const planType = subscription?.plan_type;
    const childCount = childrenList?.length || 0;
  
    return (
      <aside className="flex flex-col h-full text-text-primary bg-background-card">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <Link href="/" className="flex items-center group transition-opacity hover:opacity-80">
            <Image
              src="/klio_logo.png"
              alt="Klio AI Logo"
              width={32}
              height={32}
              className="mr-2"
              priority
            />
            <span className="text-2xl font-bold text-[var(--accent-blue)] group-hover:text-[var(--accent-blue-hover)] transition-colors">
              Klio AI
            </span>
          </Link>
        </div>
  
        {/* Students Section Header */}
        <div className="px-6 pt-2 pb-3 border-b border-border-subtle mb-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Students</h3>
            <span className="text-xs text-text-tertiary">
              {childCount}/{hasActiveSubscription ? 
                (planType === 'academy' ? '10' : planType === 'family' ? '3' : '1') : 
                '1'
              }
            </span>
          </div>
        </div>
  
        {/* Students List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1.5">
          {(childrenList || []).map(child => {
            const isSelected = selectedChild?.id === child.id;
            return (
              <div
                key={child.id}
                className={`group relative rounded-[var(--radius-md)] transition-all duration-150 ease-in-out
                  ${isSelected
                    ? 'bg-[var(--accent-blue)] text-[var(--text-on-accent)] shadow-md'
                    : 'hover:bg-[var(--accent-blue)]/20'
                  }`
                }
              >
                <button
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between focus:outline-none rounded-[var(--radius-md)]
                    ${isSelected
                      ? 'text-[var(--text-on-accent)]'
                      : 'text-text-primary hover:text-text-primary'
                    }`
                  }
                  onClick={() => onSelectChild(child)}
                >
                  <div>
                    <div className="font-medium text-sm">
                      {child.name}
                    </div>
                    <div className={`text-xs ${isSelected ? 'text-[var(--text-on-accent)] opacity-80' : 'text-text-secondary'}`}>
                      Grade {child.grade || <span className="italic">N/A</span>}
                    </div>
                  </div>
                </button>
                
                {/* Child login settings - only show if user has access */}
                {hasActiveSubscription && (planType === 'family' || planType === 'academy') ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onOpenChildLoginSettings(child);}}
                    className={`absolute top-1/2 right-1.5 -translate-y-1/2 p-1 rounded-full transition-all focus:ring-0
                              ${isSelected
                                    ? 'text-[var(--text-on-accent)] opacity-70 hover:bg-[var(--accent-blue-hover)]/[0.5] hover:opacity-100'
                                    : 'text-text-tertiary hover:bg-[var(--accent-blue)]/30 hover:text-text-primary opacity-0 group-hover:opacity-100 focus:opacity-100'
                              }`
                            }
                    title={`Login settings for ${child.name}`}
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className={`absolute top-1/2 right-1.5 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity
                    ${isSelected ? 'text-[var(--text-on-accent)]' : 'text-text-tertiary'}`}>
                    <div className="text-xs">
                      Family+
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
  
        {/* Subscription & Add Student Section */}
        <div className="p-4 border-t border-border-subtle">
          {/* Subscription Section */}
          <div className="mb-4">
            <SubscriptionManager children={childrenList} compact={true} />
          </div>
  
          {/* Add Student Section */}
          {!showAddChild ? (
            <div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => onToggleShowAddChild(true)}
                className="w-full"
                disabled={!canAddChild}
                title={!canAddChild ? "Upgrade your plan to add more children" : "Add a new student"}
              >
                <UserPlusIcon className="h-5 w-5 mr-2"/> 
                {canAddChild ? "Add Student" : "Upgrade to Add Student"}
              </Button>
              {!canAddChild && (
                <div className="mt-2 p-2 bg-orange-50 rounded-md border border-orange-200">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-orange-800">Plan Limit Reached</p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        {hasActiveSubscription ? (
                          planType === 'klio_addon' ? 
                            'Upgrade to Family Plan for up to 3 children' :
                            planType === 'family' ?
                              'Upgrade to Academy Plan for up to 10 children' :
                              'Contact support for more children'
                        ) : (
                          'Free plan includes 1 child. Upgrade for more!'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={onAddChildSubmit} className="flex flex-col gap-2 p-3 bg-background-main rounded-lg border border-border-subtle">
              <input
                value={newChildName}
                onChange={onNewChildNameChange}
                placeholder="Student Name"
                className="block w-full border-border-input focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue rounded-lg bg-background-card text-text-primary placeholder-text-tertiary shadow-sm text-sm px-3 py-2" 
                required 
              />
              <input
                value={newChildGrade}
                onChange={onNewChildGradeChange}
                placeholder="Grade Level"
                className="block w-full border-border-input focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue rounded-lg bg-background-card text-text-primary placeholder-text-tertiary shadow-sm text-sm px-3 py-2" 
              />
              <div className="flex gap-2 mt-1.5">
                <Button type="submit" variant="primary" size="sm" className="flex-1">
                  <CheckIcon className="h-4 w-4 mr-1.5"/> Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onToggleShowAddChild(false)}
                  className="flex-1"
                >
                  <XMarkIcon className="h-4 w-4 mr-1.5"/> Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
  
        {/* Logout Section */}
        <div className="p-4 border-t border-border-subtle mt-auto">
          <Button
            as="link"
            href="/api/auth/logout"
            variant="ghost"
            size="md"
            className="w-full !text-[var(--messageTextDanger)] hover:!bg-[var(--messageTextDanger)]/10"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2"/>
            Log Out
          </Button>
        </div>
      </aside>
    );
  }