import { postRepository } from "@/lib/repositories/post.repository";

export const postService = {
  getPostBySlug(slug: string) {
    return postRepository.findBySlug(slug);
  },

  getPublishedFeed(take?: number) {
    return postRepository.listPublished(take);
  },
};
