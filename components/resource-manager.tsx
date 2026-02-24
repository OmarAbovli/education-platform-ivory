'use client'

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createResource, updateResource, deleteResource } from '@/server/resource-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const resourceSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    url: z.string().url('Must be a valid URL'),
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

type Resource = {
    id: string;
    title: string;
    url: string;
    created_at: Date;
};

function ResourceForm({ videoId, resource, onFinished }: { videoId?: string, resource?: Resource, onFinished: () => void }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const { register, handleSubmit, formState: { errors } } = useForm<ResourceFormValues>({
        resolver: zodResolver(resourceSchema),
        defaultValues: { title: resource?.title || '', url: resource?.url || '' },
    });

    const onSubmit = (data: ResourceFormValues) => {
        startTransition(async () => {
            const action = resource
                ? updateResource(resource.id, data.title, data.url)
                : createResource(videoId!, data.title, data.url);
            
            const res = await action;
            if (res.success) {
                toast({ title: 'Success', description: `Resource ${resource ? 'updated' : 'created'}.` });
                onFinished();
                router.refresh();
            } else {
                toast({ title: 'Error', description: 'An error occurred.', variant: 'destructive' });
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register('title')} />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" {...register('url')} />
                {errors.url && <p className="text-sm text-red-500">{errors.url.message}</p>}
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
        </form>
    );
}

export function ResourceManager({ videoId, resources }: { videoId: string, resources: Resource[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isDeleting, startDeleting] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleDelete = (resourceId: string) => {
        startDeleting(async () => {
            const res = await deleteResource(resourceId);
            if (res.success) {
                toast({ title: 'Success', description: 'Resource deleted.' });
                router.refresh();
            } else {
                toast({ title: 'Error', description: 'Failed to delete resource.', variant: 'destructive' });
            }
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Video Resources</CardTitle>
                    <CardDescription>Attach files, links, or images for your students.</CardDescription>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Resource</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Resource</DialogTitle>
                        </DialogHeader>
                        <ResourceForm videoId={videoId} onFinished={() => setIsFormOpen(false)} />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {resources.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No resources attached to this video yet.</p>
                    ) : (
                        resources.map(resource => (
                            <div key={resource.id} className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                    <p className="font-medium">{resource.title}</p>
                                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground truncate">{resource.url}</a>
                                </div>
                                <div className="flex gap-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">Edit</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Edit Resource</DialogTitle>
                                            </DialogHeader>
                                            <ResourceForm resource={resource} onFinished={() => {}} />
                                        </DialogContent>
                                    </Dialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" disabled={isDeleting}>Delete</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete the resource.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(resource.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
