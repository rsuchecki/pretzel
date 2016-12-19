# Chromosome
# =========

# The initial design aims to match the data structure from AgriBio.
# The chromosome table stores the length of v0.4 pseudochromosomes.  

# Created by Sean Li (sean.li@csiro.au)
# Updated by 12/08/2016
# Comments: 

module.exports = 
	# sails automatically adds 'created at' and 'updated at' fields that we don't want.
	attributes :
		name:
			type: 'string'
			required: true

		markers:
      collection: 'marker'
