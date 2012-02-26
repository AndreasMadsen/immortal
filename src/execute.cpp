/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

#include <stdlib.h> /* exit */
#include <unistd.h> /* fork, setsid */
#include <stdio.h> /* printf */
#include <signal.h> /* signal */
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <errno.h> /* perror */

int main(int argc, char *argv[]) {
  char *filename = argv[0];
  char **args = &argv[1];
  int pid;

  signal(SIGHUP, SIG_IGN);

  pid = fork();
  if (pid < 0) {
    /* this is an error */
    perror("fork()");
    exit(1);
  }
  else if (pid > 0) {
    /* this is the parent */
    printf("{\"pid\": %d}", pid);
    exit(0);
  }

  /* this is the child */

  if (setsid() < 0) {
    perror("setsid()");
    exit(1);
  }
  umask(022);

  if (execvp(filename, args) < 0) {
    perror("execvp()");
    exit(1);
  }
  /* there's really no way to get here, ever. */
  return 0;
}
