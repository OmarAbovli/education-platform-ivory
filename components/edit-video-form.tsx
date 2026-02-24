'use client'

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateVideo } from '@/server/teacher-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { VideoPackage } from '@/server/package-actions';

const videoSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    url: z.string().url('Must be a valid URL').optional(),
    category: z.string().optional(),
    package_id: z.string().min(1, "Package is required"),
    is_free: z.boolean(),
    grades: z.array(z.number()).min(1, 'At least one grade must be selected'),
    thumbnail_url: z.string().url('Must be a valid URL').optional(),
});

type VideoFormValues = z.infer<typeof videoSchema>;

const gradeOptions = [
    { label: "First year", value: 1 },
    { label: "Second year", value: 2 },
    { label: "Third year", value: 3 },
];

export function EditVideoForm({ video, packages }: { video: any, packages: VideoPackage[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const { control, register, handleSubmit, formState: { errors } } = useForm<VideoFormValues>({
        resolver: zodResolver(videoSchema),
        defaultValues: {
            title: video.title || '',
            description: video.description || '',
            url: video.url || '',
            category: video.category || '',
            package_id: video.package_id || '',
            is_free: video.is_free || false,
            grades: video.grades || [],
            thumbnail_url: video.thumbnail_url || '',
        },
    });

    const onSubmit = (data: VideoFormValues) => {
        startTransition(async () => {
            const res = await updateVideo(video.id, data);
            if (res.ok) {
                toast({ title: 'Success', description: 'Video updated successfully.' });
                router.refresh();
            } else {
                toast({ title: 'Error', description: res.error || 'Failed to update video.', variant: 'destructive' });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Video Details</CardTitle>
                <CardDescription>Update the details for your video.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" {...register('title')} />
                        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register('description')} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" {...register('category')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="package_id">Package</Label>
                            <Controller
                                name="package_id"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select package" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {packages.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.package_id && <p className="text-sm text-red-500">{errors.package_id.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Grades</Label>
                        <Controller
                            name="grades"
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-wrap gap-4">
                                    {gradeOptions.map((g) => (
                                        <label key={g.value} className="flex items-center gap-2 text-sm">
                                            <Checkbox
                                                checked={field.value?.includes(g.value)}
                                                onCheckedChange={(checked) => {
                                                    const newValue = checked
                                                        ? [...(field.value || []), g.value]
                                                        : (field.value || []).filter((v) => v !== g.value);
                                                    field.onChange(newValue);
                                                }}
                                            />
                                            <span>{g.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        />
                        {errors.grades && <p className="text-sm text-red-500">{errors.grades.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                        <Input id="thumbnail_url" {...register('thumbnail_url')} />
                        {errors.thumbnail_url && <p className="text-sm text-red-500">{errors.thumbnail_url.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="url">Video URL</Label>
                        <Input id="url" {...register('url')} />
                         {errors.url && <p className="text-sm text-red-500">{errors.url.message}</p>}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Controller
                            name="is_free"
                            control={control}
                            render={({ field }) => <Checkbox id="is_free" checked={field.value} onCheckedChange={field.onChange} />}
                        />
                        <Label htmlFor="is_free">This is a free video</Label>
                    </div>

                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
