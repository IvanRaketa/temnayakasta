import { userRepository } from "@/lib/repositories/user.repository";

export const userService = {
  getUserById(id: string) {
    return userRepository.findById(id);
  },

  getUserByUsername(username: string) {
    return userRepository.findByUsername(username);
  },
};
