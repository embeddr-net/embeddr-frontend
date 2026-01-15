import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchActionArtifacts, createArtifact } from '@/lib/api' // Added createArtifact
import { Link, useNavigate } from '@tanstack/react-router' // Added useNavigate
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Plus, Play, GitBranch } from 'lucide-react'
import { Spinner } from '@embeddr/react-ui/components/spinner'

export const ActionGraphPage = () => {
  const navigate = useNavigate()
  const { data: actions, isLoading } = useQuery({
    queryKey: ['actions'],
    queryFn: fetchActionArtifacts,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create a default empty graph
      return createArtifact({
        type_name: 'action:graph',
        metadata_json: {
          name: 'Untitled Graph',
          description: 'New workflow pipeline',
          graph: {
            nodes: [],
            interface: { exposed_inputs: [] },
          },
        },
      })
    },
    onSuccess: (newArtifact) => {
      navigate({
        to: '/actions/$actionId',
        params: { actionId: newArtifact.id },
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Action Graphs</h1>
          <p className="text-muted-foreground mt-2">
            Compose and run automated pipelines
          </p>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          {createMutation.isPending ? 'Creating...' : 'New Graph'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions?.map((action) => (
          <Card key={action.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <div className="space-y-1">
                <Link
                  to="/actions/$actionId"
                  params={{ actionId: action.id }}
                  className="hover:underline"
                >
                  <CardTitle className="text-xl">
                    {action.metadata_json?.name || 'Untitled Graph'}
                  </CardTitle>
                </Link>
                <CardDescription>
                  {action.metadata_json?.description || 'No description'}
                </CardDescription>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mt-4">
                <div className="text-xs text-muted-foreground font-mono">
                  {action.id.slice(0, 8)}
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/actions/$actionId"
                    params={{ actionId: action.id }}
                  >
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button size="sm">
                    <Play className="mr-2 h-3 w-3" /> Run
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!actions || actions.length === 0) && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            No action graphs found. Create one or run the seed script!
          </div>
        )}
      </div>
    </div>
  )
}
