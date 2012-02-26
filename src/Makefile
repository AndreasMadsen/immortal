#
# Copyright (c) 2012 Andreas Madsen
# MIT License
#

# define project variables
CC	= gcc
OUTPUT	= ./out/
NAME	= execute
LINK	= ../lib/executables/execute
FILE = $(NAME)-$(OS)

# define OS so it match process.platform
OS	= $(shell uname -s|awk '{print tolower($$0)}')

# define ANSI color reset
reset	= "\033[0m"
yellow  = "\033[33m"
green	= "\033[32m"

$(NAME):
# make output directory
	@mkdir -p $(OUTPUT)

# compile for both 32-bit and 64-bit
	@printf $(reset)$(yellow)
	$(CC) -m32 -o $(OUTPUT)$(FILE) $(NAME).cpp

# done
	@printf $(green)
	@echo "compiled execute for $(OS)"
	@printf $(reset)

clean:
#cleanup by removeing the compled file for this os and the link
	@printf $(reset)$(yellow)
	rm -f $(OUTPUT)$(FILE)
	rm -f $(LINK)

# done
	@printf $(green)
	@echo "working on clean"
	@printf $(reset)

link:
# like the propper file to lib/executables
	@printf $(reset)$(yellow)
	ln -fs $(OUTPUT)$(FILE) $(LINK)

# done
	@printf $(green)
	@echo "precompiled file $(FILE) linked to executeables"
	@printf $(reset)
