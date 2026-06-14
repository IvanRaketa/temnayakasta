import { commentRepository } from "@/lib/repositories/comment.repository";

export const commentService = {
  getPostComments(postId: string) {
    return commentRepository.listByPost(postId);
  },
};
